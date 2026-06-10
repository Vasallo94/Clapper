// scripts/generate-sound-design.ts
// Usage: npx tsx scripts/generate-sound-design.ts <path-to-config.json>
//
// Generates music bed via Google Lyria 3, SFX via Lyria (with library fallback).
// Falls back to ElevenLabs if ELEVENLABS_API_KEY is set and Google fails.

import { GoogleGenAI } from "@google/genai"
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs"
import { createHash } from "crypto"
import path from "path"

const configPath = process.argv[2]
if (!configPath) {
  console.error("Usage: npx tsx scripts/generate-sound-design.ts <path-to-config.json>")
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

if (!config.soundDesign?.enabled) {
  console.log("ℹ️  Sound design not enabled in config. Skipping.")
  process.exit(0)
}

// --- Google GenAI / Vertex AI setup ---

const googleCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
let ai: GoogleGenAI | null = null

if (googleCredentialsPath && existsSync(path.resolve(googleCredentialsPath))) {
  const absPath = path.resolve(googleCredentialsPath)
  process.env.GOOGLE_APPLICATION_CREDENTIALS = absPath
  const saContent = JSON.parse(readFileSync(absPath, "utf-8"))
  const projectId = saContent.project_id
  if (projectId) {
    ai = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: "global",
      googleAuthOptions: {
        credentials: {
          client_email: saContent.client_email,
          private_key: saContent.private_key,
        },
      },
    })
    console.log(`🔑 Using Vertex AI with service account (project: ${projectId})`)
  }
}

if (!ai) {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey })
    console.log("🔑 Using Google AI Studio with API key")
  }
}

// --- ElevenLabs fallback ---
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY

if (!ai && !elevenLabsApiKey) {
  console.error("❌ Set GOOGLE_APPLICATION_CREDENTIALS or ELEVENLABS_API_KEY")
  process.exit(1)
}

const outputDir = path.resolve("public", "audio", config.id)
mkdirSync(outputDir, { recursive: true })

const fingerprintsPath = path.join(outputDir, "fingerprints.json")

interface Fingerprints {
  [key: string]: string
}

function loadFingerprints(): Fingerprints {
  if (existsSync(fingerprintsPath)) {
    return JSON.parse(readFileSync(fingerprintsPath, "utf-8")) as Fingerprints
  }
  return {}
}

function saveFingerprints(fingerprints: Fingerprints) {
  writeFileSync(fingerprintsPath, JSON.stringify(fingerprints, null, 2))
}

function createFingerprint(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

function getTotalDurationSeconds(): number {
  const scenes = config.scenes || []
  return scenes.reduce((sum: number, scene: { durationInSeconds?: number }) => {
    return sum + (scene.durationInSeconds || 0)
  }, 0)
}

// --- Lyria 3 (Google) ---

async function generateWithLyria(prompt: string, outputPath: string, label: string): Promise<boolean> {
  if (!ai) return false

  const maxRetries = 3
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "lyria-3-clip-preview",
        contents: prompt,
        config: {
          responseModalities: ["AUDIO", "TEXT"],
        },
      })

      const parts = response.candidates?.[0]?.content?.parts || []
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, "base64")
          writeFileSync(outputPath, buffer)
          console.log(`  ✅ ${label} → ${outputPath} (${buffer.length} bytes, Lyria 3)`)
          return true
        }
      }
      console.warn(`  ⚠️  Lyria returned no audio data for ${label}`)
      return false
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const isRateLimit = msg.includes("429")
      if (isRateLimit && attempt < maxRetries) {
        const waitSec = 15 * (attempt + 1)
        console.log(`  ⏳ Rate limited on ${label}, waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})...`)
        await new Promise((r) => setTimeout(r, waitSec * 1000))
      } else {
        console.warn(`  ⚠️  Lyria failed for ${label}: ${msg.slice(0, 120)}`)
        return false
      }
    }
  }
  return false
}

// --- ElevenLabs fallback ---

async function fetchElevenLabs(url: string, body: object, label: string): Promise<Buffer | null> {
  if (!elevenLabsApiKey) return null

  const maxRetries = 3
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": elevenLabsApiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (response.status === 429 && attempt < maxRetries) {
      const waitSec = 15 * (attempt + 1)
      console.log(`  ⏳ Rate limited on ${label}, waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})...`)
      await new Promise((r) => setTimeout(r, waitSec * 1000))
      continue
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`  ⚠️  ElevenLabs error ${response.status} for ${label}: ${errorText.slice(0, 100)}`)
      return null
    }

    return Buffer.from(await response.arrayBuffer())
  }
  return null
}

// --- Music bed ---

async function generateMusicBed(fingerprints: Fingerprints) {
  const musicBed = config.soundDesign.musicBed
  if (!musicBed) return

  const outputPath = path.join(outputDir, "music-bed.mp3")

  // Library track (local copy)
  if (musicBed.libraryId) {
    const libraryPath = path.resolve("public", "audio", "library", `${musicBed.libraryId}.mp3`)
    if (!existsSync(libraryPath)) {
      console.error(`❌ Library music bed not found: ${libraryPath}`)
      process.exit(1)
    }

    const fp = createFingerprint({ type: "music-bed-library", libraryId: musicBed.libraryId })
    if (fingerprints["music-bed"] === fp && existsSync(outputPath)) {
      console.log("  ⏭️  Music bed already exists (library), skipping")
      return
    }

    console.log(`🎵 Copying library music bed: ${musicBed.libraryId}`)
    copyFileSync(libraryPath, outputPath)
    fingerprints["music-bed"] = fp
    console.log(`  ✅ Music bed → ${outputPath}`)
    return
  }

  // Generated music bed
  if (musicBed.customPrompt) {
    const totalDurationSeconds = getTotalDurationSeconds()
    const fp = createFingerprint({
      type: "music-bed-generated",
      prompt: musicBed.customPrompt,
      durationSeconds: totalDurationSeconds + 5,
      provider: ai ? "lyria" : "elevenlabs",
    })

    if (fingerprints["music-bed"] === fp && existsSync(outputPath)) {
      console.log("  ⏭️  Music bed already exists (generated), skipping")
      return
    }

    const prompt = `Create a ${totalDurationSeconds}-second background music track. Style: ${musicBed.customPrompt}. This is instrumental background music for a video, keep it clean and loopable.`
    console.log(`🎵 Generating music bed: "${prompt.slice(0, 80)}..."`)

    // Try Lyria first
    const lyriaOk = await generateWithLyria(prompt, outputPath, "music-bed")
    if (lyriaOk) {
      fingerprints["music-bed"] = fp
      return
    }

    // Fallback to ElevenLabs
    if (elevenLabsApiKey) {
      console.log("  🔄 Falling back to ElevenLabs for music bed...")
      const musicUrl = new URL("https://api.elevenlabs.io/v1/music")
      musicUrl.searchParams.set("output_format", "mp3_44100_128")
      const audioBuffer = await fetchElevenLabs(
        musicUrl.toString(),
        {
          prompt: musicBed.customPrompt,
          music_length_ms: (totalDurationSeconds + 5) * 1000,
          force_instrumental: true,
        },
        "music-bed",
      )

      if (audioBuffer) {
        writeFileSync(outputPath, audioBuffer)
        fingerprints["music-bed"] = fp
        console.log(`  ✅ Music bed → ${outputPath} (ElevenLabs fallback)`)
        return
      }
    }

    console.warn("  ⚠️  Music bed generation failed on all providers")
  }
}

// --- SFX ---

interface SfxEntry {
  id: string
  prompt: string
  durationMs?: number
  loop?: boolean
}

async function generateSfx(fingerprints: Fingerprints) {
  const sfxEntries: SfxEntry[] = config.soundDesign.sfx || []
  if (sfxEntries.length === 0) return

  console.log(`🔊 Generating ${sfxEntries.length} SFX clips...`)

  for (const sfx of sfxEntries) {
    const outputPath = path.join(outputDir, `sfx-${sfx.id}.mp3`)
    const fp = createFingerprint({
      type: "sfx",
      prompt: sfx.prompt,
      durationMs: sfx.durationMs,
      loop: sfx.loop,
    })

    const fpKey = `sfx-${sfx.id}`

    if (fingerprints[fpKey] === fp && existsSync(outputPath)) {
      console.log(`  ⏭️  SFX ${sfx.id} already exists, skipping`)
      continue
    }

    // Check local library first
    const localPath = path.resolve("public", "audio", "library", `sfx-${sfx.id}.mp3`)
    if (existsSync(localPath)) {
      console.log(`  📁 SFX ${sfx.id}: using local library`)
      copyFileSync(localPath, outputPath)
      fingerprints[fpKey] = fp
      continue
    }

    console.log(`  🔊 SFX ${sfx.id}: "${sfx.prompt.slice(0, 60)}..."`)

    const durationHint = sfx.durationMs ? ` Duration: ${sfx.durationMs / 1000} seconds.` : ""
    const sfxPrompt = `Sound effect: ${sfx.prompt}. Short, clean, suitable for video production.${durationHint}`

    // Try Lyria
    const lyriaOk = await generateWithLyria(sfxPrompt, outputPath, `sfx-${sfx.id}`)
    if (lyriaOk) {
      fingerprints[fpKey] = fp
      continue
    }

    // Fallback to ElevenLabs
    if (elevenLabsApiKey) {
      console.log(`  🔄 Falling back to ElevenLabs for sfx-${sfx.id}...`)
      const sfxUrl = new URL("https://api.elevenlabs.io/v1/sound-generation")
      sfxUrl.searchParams.set("output_format", "mp3_44100_128")
      const audioBuffer = await fetchElevenLabs(
        sfxUrl.toString(),
        {
          text: sfx.prompt,
          ...(sfx.durationMs ? { duration_seconds: sfx.durationMs / 1000 } : {}),
          ...(sfx.loop ? { loop: true } : {}),
        },
        `sfx-${sfx.id}`,
      )

      if (audioBuffer) {
        writeFileSync(outputPath, audioBuffer)
        fingerprints[fpKey] = fp
        console.log(`  ✅ SFX ${sfx.id} → ${outputPath} (ElevenLabs fallback)`)
        continue
      }
    }

    console.warn(`  ⚠️  SFX ${sfx.id}: generation failed on all providers, skipping`)
  }
}

// --- Main ---

async function main() {
  console.log(`🎬 Sound design generation for "${config.id}"`)

  const fingerprints = loadFingerprints()
  const warnings: string[] = []

  try {
    await generateMusicBed(fingerprints)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`Music bed failed: ${msg}`)
    console.warn(`⚠️  Music bed generation failed (continuing with SFX): ${msg}`)
  }

  try {
    await generateSfx(fingerprints)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`SFX generation failed: ${msg}`)
    console.warn(`⚠️  SFX generation failed: ${msg}`)
  }

  saveFingerprints(fingerprints)

  if (warnings.length > 0) {
    console.log(`\n⚠️  Completed with ${warnings.length} warning(s):`)
    warnings.forEach((w) => console.log(`   - ${w}`))
  }
  console.log(`\n✅ Sound design files saved to ${outputDir}`)
}

main().catch((err) => {
  console.error("❌ Sound design generation failed:", err)
  process.exit(1)
})
