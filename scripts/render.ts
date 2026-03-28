// scripts/render.ts
// Usage: npx tsx scripts/render.ts <path-to-config.json>

import { bundle } from "@remotion/bundler"
import { renderMedia, selectComposition } from "@remotion/renderer"
import { enableTailwind } from "@remotion/tailwind-v4"
import { readFileSync } from "fs"
import { execFileSync } from "child_process"
import path from "path"
import type { Beat, Timing } from "../src/utils/direction"
import { hasExplicitDirection } from "../src/utils/direction"

const configPath = process.argv[2]
if (!configPath) {
  console.error("Usage: npx tsx scripts/render.ts <path-to-config.json>")
  process.exit(1)
}

async function main() {
  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  const outputPath = path.join(path.dirname(configPath), "output.mp4")
  const directedScenes =
    config.scenes?.filter((scene: { timing?: Timing; beats?: Beat[] }) =>
      hasExplicitDirection(scene.timing, scene.beats),
    ).length ?? 0

  if (config.voiceover?.enabled && (!config.brief || directedScenes === 0)) {
    console.warn("⚠️  No clear director pass detected. Consider adding brief/timing/beats before final render.")
  }

  if (config.voiceover?.enabled) {
    console.log("🎙️  Generating voiceover...")
    execFileSync("npx", ["tsx", "scripts/generate-voiceover.ts", configPath], {
      stdio: "inherit",
    })
  }

  if (config.soundDesign?.enabled) {
    console.log("🔊 Generating sound design...")
    execFileSync("npx", ["tsx", "scripts/generate-sound-design.ts", configPath], {
      stdio: "inherit",
    })
  }

  console.log("📦 Bundling composition...")
  const bundleLocation = await bundle({
    entryPoint: path.resolve("./src/index.ts"),
    // remotion.config.ts does NOT apply to Node.js APIs — pass override manually
    webpackOverride: enableTailwind,
  })

  const compositionId = config.composition || "ClaudeCodeTutorial"
  console.log(`🔍 Selecting composition ${compositionId}...`)
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
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
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
