// scripts/render-scene-stills.ts
// Usage: npx tsx scripts/render-scene-stills.ts <config.json> <output-dir>

import { bundle } from "@remotion/bundler"
import { renderStill, selectComposition } from "@remotion/renderer"
import { enableTailwind } from "@remotion/tailwind-v4"
import { createHash } from "crypto"
import { readFileSync, readdirSync, existsSync, mkdirSync, cpSync, statSync } from "fs"
import path from "path"

const configPath = process.argv[2]
const outputDir = process.argv[3]

if (!configPath || !outputDir) {
  console.error("Usage: npx tsx scripts/render-scene-stills.ts <config.json> <output-dir>")
  process.exit(1)
}

const CACHE_DIR = path.resolve("packages/render-service/jobs/.bundle-cache")

function computeSourceHash(): string {
  const srcDir = path.resolve("src")
  const files = readdirSync(srcDir, { recursive: true, encoding: "utf-8" })
    .filter((f) => /\.(ts|tsx|css)$/.test(f))
    .sort()

  const hash = createHash("sha256")
  for (const file of files) {
    const fullPath = path.join(srcDir, file)
    if (statSync(fullPath).isFile()) {
      hash.update(readFileSync(fullPath))
    }
  }
  return hash.digest("hex").slice(0, 16)
}

async function getCachedOrBundle(): Promise<string> {
  const hash = computeSourceHash()
  const cachedPath = path.join(CACHE_DIR, hash)

  if (existsSync(cachedPath)) {
    return cachedPath
  }

  const bundleLocation = await bundle({
    entryPoint: path.resolve("./src/index.ts"),
    webpackOverride: enableTailwind,
  })

  mkdirSync(CACHE_DIR, { recursive: true })
  cpSync(bundleLocation, cachedPath, { recursive: true })
  return cachedPath
}

async function main() {
  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  mkdirSync(outputDir, { recursive: true })

  const bundleLocation = await getCachedOrBundle()

  const compositionId = config.composition || "ClaudeCodeTutorial"
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: config,
  })

  const fps = config.fps || 30
  const scenes: Array<{ index: number; path: string; frameNumber: number }> = []
  let cumulativeFrames = 0

  for (let i = 0; i < (config.scenes?.length ?? 0); i++) {
    const scene = config.scenes[i]
    const durationSec = scene.durationInSeconds || 5
    const durationFrames = Math.round(durationSec * fps)
    const targetFrame = cumulativeFrames + Math.floor(durationFrames * 0.6)
    const clampedFrame = Math.min(targetFrame, composition.durationInFrames - 1)

    const outputPath = path.join(outputDir, `scene-${i}.png`)

    await renderStill({
      composition,
      serveUrl: bundleLocation,
      output: outputPath,
      inputProps: config,
      frame: clampedFrame,
      imageFormat: "png",
    })

    scenes.push({ index: i, path: outputPath, frameNumber: clampedFrame })
    cumulativeFrames += durationFrames
  }

  const manifest = { scenes }
  process.stdout.write(JSON.stringify(manifest))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
