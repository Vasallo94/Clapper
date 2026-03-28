// scripts/generate-voiceover.ts
// Usage: npx tsx scripts/generate-voiceover.ts <path-to-config.json>

import { GoogleGenAI } from "@google/genai"
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "fs"
import { execFileSync } from "child_process"
import { createHash } from "crypto"
import path from "path"
import {
  type ElevenLabsOptions,
  getVoiceoverSceneObject,
  getVoiceoverText,
  type VoiceoverScene,
} from "../src/utils/direction"

const configPath = process.argv[2]
if (!configPath) {
  console.error("Usage: npx tsx scripts/generate-voiceover.ts <path-to-config.json>")
  process.exit(1)
}

const envPath = path.resolve(".env")
if (existsSync(envPath)) {
  const envContents = readFileSync(envPath, "utf-8")
  for (const line of envContents.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "")
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

const config = JSON.parse(readFileSync(configPath, "utf-8"))

if (!config.voiceover?.enabled) {
  console.log("ℹ️  Voiceover not enabled in config. Skipping.")
  process.exit(0)
}

const provider = config.voiceover.provider || "gemini"
const voiceId = config.voiceover.voiceId || "Orus"
const languageCode = config.voiceover.language || "es-ES"
const elevenLabsDefaults = (config.voiceover.elevenlabs || {}) as ElevenLabsOptions
const scenes = config.voiceover.scenes || {}
const outDir = path.resolve("public", "voiceover", config.id)

mkdirSync(outDir, { recursive: true })

const geminiApiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY

if (provider === "gemini" && !geminiApiKey) {
  console.error("❌ Set GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable")
  process.exit(1)
}

if (provider === "elevenlabs" && !elevenLabsApiKey) {
  console.error("❌ Set ELEVENLABS_API_KEY environment variable")
  process.exit(1)
}

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null

async function generateWithGemini(sceneIndex: string, text: string, mp3Path: string) {
  if (!ai) {
    throw new Error("Gemini client not initialized")
  }

  let response
  const maxRetries = 3
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            languageCode,
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceId },
            },
          },
        },
      })
      break
    } catch (err: unknown) {
      const isRateLimit = err instanceof Error && err.message.includes("429")
      if (isRateLimit && attempt < maxRetries) {
        const waitSec = 15 * (attempt + 1)
        console.log(`  ⏳ Rate limited, waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})...`)
        await new Promise((r) => setTimeout(r, waitSec * 1000))
      } else {
        throw err
      }
    }
  }

  const audioPart = response?.candidates?.[0]?.content?.parts?.[0]
  if (!audioPart?.inlineData?.data) {
    throw new Error(`No audio data returned for scene ${sceneIndex}`)
  }

  const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64")
  const pcmPath = path.join(outDir, `${sceneIndex}.pcm`)

  writeFileSync(pcmPath, pcmBuffer)

  execFileSync("ffmpeg", ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcmPath, "-y", mp3Path], {
    stdio: "pipe",
  })

  unlinkSync(pcmPath)
}

function compactObject<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined))
}

function createSceneFingerprint(sceneIndex: string, sceneText: string, sceneValue: VoiceoverScene | undefined) {
  const basePayload = {
    provider,
    voiceId,
    languageCode,
    sceneIndex,
    text: sceneText,
    sceneValue,
  }

  return createHash("sha256").update(JSON.stringify(basePayload)).digest("hex")
}

function getSceneElevenLabsOptions(scene?: VoiceoverScene): ElevenLabsOptions {
  const sceneOptions = getVoiceoverSceneObject(scene)?.elevenlabs

  return compactObject({
    ...elevenLabsDefaults,
    ...sceneOptions,
    voiceSettings:
      elevenLabsDefaults.voiceSettings || sceneOptions?.voiceSettings
        ? compactObject({
            ...elevenLabsDefaults.voiceSettings,
            ...sceneOptions?.voiceSettings,
          })
        : undefined,
    pronunciationDictionaries: sceneOptions?.pronunciationDictionaries ?? elevenLabsDefaults.pronunciationDictionaries,
    previousText: sceneOptions?.previousText ?? elevenLabsDefaults.previousText,
    nextText: sceneOptions?.nextText ?? elevenLabsDefaults.nextText,
  }) as ElevenLabsOptions
}

async function generateWithElevenLabs(text: string, mp3Path: string, scene?: VoiceoverScene) {
  const options = getSceneElevenLabsOptions(scene)
  const searchParams = new URLSearchParams()
  searchParams.set("output_format", options.outputFormat || "mp3_44100_128")
  if (typeof options.enableLogging === "boolean") {
    searchParams.set("enable_logging", String(options.enableLogging))
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?${searchParams.toString()}`, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": elevenLabsApiKey as string,
    },
    body: JSON.stringify({
      text,
      model_id: options.modelId || "eleven_multilingual_v2",
      language_code: options.languageCode || languageCode,
      seed: options.seed,
      apply_text_normalization: options.applyTextNormalization,
      previous_text: options.previousText,
      next_text: options.nextText,
      pronunciation_dictionary_locators: options.pronunciationDictionaries?.map((dictionary) => ({
        pronunciation_dictionary_id: dictionary.id,
        version_id: dictionary.versionId,
      })),
      voice_settings: options.voiceSettings
        ? compactObject({
            stability: options.voiceSettings.stability,
            similarity_boost: options.voiceSettings.similarityBoost,
            style: options.voiceSettings.style,
            use_speaker_boost: options.voiceSettings.useSpeakerBoost,
            speed: options.voiceSettings.speed,
          })
        : undefined,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs error ${response.status}: ${errorText}`)
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(mp3Path, audioBuffer)
}

async function generateScene(sceneIndex: string, text: string, sceneValue?: VoiceoverScene) {
  const mp3Path = path.join(outDir, `${sceneIndex}.mp3`)
  const metaPath = path.join(outDir, `${sceneIndex}.meta.json`)
  const fingerprint = createSceneFingerprint(sceneIndex, text, sceneValue)

  if (existsSync(mp3Path) && existsSync(metaPath)) {
    const existingMeta = JSON.parse(readFileSync(metaPath, "utf-8")) as { fingerprint?: string }
    if (existingMeta.fingerprint === fingerprint) {
      console.log(`  ⏭️  Scene ${sceneIndex} already exists, skipping`)
      return
    }
  }

  if (existsSync(mp3Path)) {
    console.log(`  🔁 Scene ${sceneIndex} changed, regenerating audio`)
  }

  console.log(`  🎙️  Scene ${sceneIndex}: "${text.slice(0, 60)}..."`)

  if (provider === "elevenlabs") {
    await generateWithElevenLabs(text, mp3Path, sceneValue)
  } else {
    await generateWithGemini(sceneIndex, text, mp3Path)
  }
  writeFileSync(metaPath, JSON.stringify({ fingerprint }, null, 2))
  console.log(`  ✅ Scene ${sceneIndex} → ${mp3Path}`)
}

async function main() {
  const entries = Object.entries(scenes)
  console.log(`🎙️  Generating ${entries.length} voiceover clips (provider: ${provider}, voice: ${voiceId})...`)

  for (const [sceneIndex, sceneValue] of entries as Array<[string, VoiceoverScene]>) {
    const text = getVoiceoverText(sceneValue)
    if (!text) {
      console.log(`  ⏭️  Scene ${sceneIndex} has no voiceover text, skipping`)
      continue
    }
    await generateScene(sceneIndex, text, sceneValue)
  }

  console.log(`\n✅ Voiceover files saved to ${outDir}`)
}

main().catch((err) => {
  console.error("❌ Voiceover generation failed:", err)
  process.exit(1)
})
