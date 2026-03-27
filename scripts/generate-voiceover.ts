// scripts/generate-voiceover.ts
// Usage: npx tsx scripts/generate-voiceover.ts <path-to-config.json>

import { GoogleGenAI } from "@google/genai"
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from "fs"
import { execFileSync } from "child_process"
import path from "path"

const configPath = process.argv[2]
if (!configPath) {
  console.error("Usage: npx tsx scripts/generate-voiceover.ts <path-to-config.json>")
  process.exit(1)
}

const config = JSON.parse(readFileSync(configPath, "utf-8"))

if (!config.voiceover?.enabled) {
  console.log("ℹ️  Voiceover not enabled in config. Skipping.")
  process.exit(0)
}

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error("❌ Set GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable")
  process.exit(1)
}

const voiceId = config.voiceover.voiceId || "Orus"
const scenes: Record<string, string> = config.voiceover.scenes || {}
const outDir = path.resolve("public", "voiceover", config.id)

mkdirSync(outDir, { recursive: true })

const ai = new GoogleGenAI({ apiKey })

async function generateScene(sceneIndex: string, text: string) {
  const mp3Path = path.join(outDir, `${sceneIndex}.mp3`)

  if (existsSync(mp3Path)) {
    console.log(`  ⏭️  Scene ${sceneIndex} already exists, skipping`)
    return
  }

  console.log(`  🎙️  Scene ${sceneIndex}: "${text.slice(0, 60)}..."`)

  const maxRetries = 3
  let response
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
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
    console.error(`  ❌ No audio data returned for scene ${sceneIndex}`)
    return
  }

  const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64")
  const pcmPath = path.join(outDir, `${sceneIndex}.pcm`)

  writeFileSync(pcmPath, pcmBuffer)

  execFileSync("ffmpeg", ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcmPath, "-y", mp3Path], {
    stdio: "pipe",
  })

  unlinkSync(pcmPath)
  console.log(`  ✅ Scene ${sceneIndex} → ${mp3Path}`)
}

async function main() {
  const entries = Object.entries(scenes)
  console.log(`🎙️  Generating ${entries.length} voiceover clips (voice: ${voiceId})...`)

  for (const [sceneIndex, text] of entries) {
    await generateScene(sceneIndex, text)
  }

  console.log(`\n✅ Voiceover files saved to ${outDir}`)
}

main().catch((err) => {
  console.error("❌ Voiceover generation failed:", err)
  process.exit(1)
})
