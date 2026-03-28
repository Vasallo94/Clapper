// scripts/generate-sound-design.ts
// Usage: npx tsx scripts/generate-sound-design.ts <path-to-config.json>

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

const apiKey = process.env.ELEVENLABS_API_KEY as string
if (!apiKey) {
  console.error("❌ Set ELEVENLABS_API_KEY environment variable")
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

async function fetchWithRetry(url: string, options: RequestInit, label: string): Promise<Response> {
  const maxRetries = 3
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)

    if (response.status === 429 && attempt < maxRetries) {
      const waitSec = 15 * (attempt + 1)
      console.log(`  ⏳ Rate limited on ${label}, waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})...`)
      await new Promise((r) => setTimeout(r, waitSec * 1000))
      continue
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs error ${response.status} for ${label}: ${errorText}`)
    }

    return response
  }

  throw new Error(`Max retries exceeded for ${label}`)
}

async function generateMusicBed(fingerprints: Fingerprints) {
  const musicBed = config.soundDesign.musicBed
  if (!musicBed) return

  const outputPath = path.join(outputDir, "music-bed.mp3")

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

  if (musicBed.customPrompt) {
    const totalDurationSeconds = getTotalDurationSeconds()
    const fp = createFingerprint({
      type: "music-bed-generated",
      prompt: musicBed.customPrompt,
      durationSeconds: totalDurationSeconds + 5,
    })

    if (fingerprints["music-bed"] === fp && existsSync(outputPath)) {
      console.log("  ⏭️  Music bed already exists (generated), skipping")
      return
    }

    console.log(`🎵 Generating music bed: "${musicBed.customPrompt.slice(0, 60)}..."`)

    const response = await fetchWithRetry(
      "https://api.elevenlabs.io/v1/music/compose",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: musicBed.customPrompt,
          duration_seconds: totalDurationSeconds + 5,
          mode: "instrumental",
          loudness: -14,
          quality: "high",
        }),
      },
      "music-bed",
    )

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    writeFileSync(outputPath, audioBuffer)
    fingerprints["music-bed"] = fp
    console.log(`  ✅ Music bed → ${outputPath}`)
  }
}

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

    console.log(`  🔊 SFX ${sfx.id}: "${sfx.prompt.slice(0, 60)}..."`)

    const response = await fetchWithRetry(
      "https://api.elevenlabs.io/v1/text-to-sound-effects/convert",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sfx.prompt,
          ...(sfx.durationMs ? { duration_seconds: sfx.durationMs / 1000 } : {}),
          ...(sfx.loop ? { loop: true } : {}),
          output_format: "mp3_44100_128",
        }),
      },
      `sfx-${sfx.id}`,
    )

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    writeFileSync(outputPath, audioBuffer)
    fingerprints[fpKey] = fp
    console.log(`  ✅ SFX ${sfx.id} → ${outputPath}`)
  }
}

async function main() {
  console.log(`🎬 Sound design generation for "${config.id}"`)

  const fingerprints = loadFingerprints()

  await generateMusicBed(fingerprints)
  await generateSfx(fingerprints)

  saveFingerprints(fingerprints)

  console.log(`\n✅ Sound design files saved to ${outputDir}`)
}

main().catch((err) => {
  console.error("❌ Sound design generation failed:", err)
  process.exit(1)
})
