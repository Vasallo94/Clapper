// scripts/render.ts
// Usage: npx tsx scripts/render.ts tutorials/[slug]/config.json

import { bundle } from "@remotion/bundler"
import { renderMedia, selectComposition } from "@remotion/renderer"
import { enableTailwind } from "@remotion/tailwind-v4"
import { readFileSync, copyFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "fs"
import path from "path"

const configPath = process.argv[2]
if (!configPath) {
  console.error("Usage: npx tsx scripts/render.ts tutorials/[slug]/config.json")
  process.exit(1)
}

async function main() {
  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  const outputPath = path.join(path.dirname(configPath), "output.mp4")

  // Resolve screenRecording assets → copy to public/ for Remotion bundler
  const tutorialDir = path.dirname(path.resolve(configPath))
  const slug = path.basename(tutorialDir)
  const assetDir = path.join("public", "tutorial-assets", slug)
  const assetsToCopy: string[] = []

  for (const scene of config.scenes) {
    if (scene.type === "screenRecording" && scene.src) {
      const srcPath = path.join(tutorialDir, scene.src)
      if (!existsSync(srcPath)) {
        console.error(`❌ Asset not found: ${srcPath}`)
        console.error("Run VHS first, or drop the recording manually into the assets/ folder.")
        process.exit(1)
      }
      mkdirSync(assetDir, { recursive: true })
      const filename = path.basename(scene.src)
      const destPath = path.join(assetDir, filename)
      copyFileSync(srcPath, destPath)
      assetsToCopy.push(assetDir)
      scene.resolvedSrc = `tutorial-assets/${slug}/${filename}`
    }
  }

  try {
    console.log("📦 Bundling composition...")
    const bundleLocation = await bundle({
      entryPoint: path.resolve("./src/index.ts"),
      // remotion.config.ts does NOT apply to Node.js APIs — pass override manually
      webpackOverride: enableTailwind,
    })

    console.log("🔍 Selecting composition ClaudeCodeTutorial...")
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "ClaudeCodeTutorial",
      inputProps: config,
    })

    console.log(`🎬 Rendering ${composition.durationInFrames} frames...`)
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: config,
      onProgress: ({ progress }) => {
        process.stdout.write(`\r  ${Math.round(progress * 100)}%`)
      },
    })

    console.log(`\n✅ Video generated: ${outputPath}`)
  } finally {
    // Clean up copied assets
    for (const dir of assetsToCopy) {
      rmSync(dir, { recursive: true, force: true })
    }
    const parentDir = path.join("public", "tutorial-assets")
    if (existsSync(parentDir)) {
      const remaining = readdirSync(parentDir)
      if (remaining.length === 0) rmSync(parentDir, { recursive: true, force: true })
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
