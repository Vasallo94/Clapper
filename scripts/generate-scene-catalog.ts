// scripts/generate-scene-catalog.ts
// Usage: npx tsx scripts/generate-scene-catalog.ts
// Reads customSceneRegistry.ts to get component IDs
// Outputs src/shared/scene-catalog.json

import fs from "fs"
import path from "path"

// Import the registry
import { customSceneRegistry } from "../src/compositions/ClaudeCodeTutorial/customSceneRegistry"

interface SceneCatalogEntry {
  componentId: string
  composition: string
  description: string
}

const catalog = {
  generatedAt: new Date().toISOString(),
  scenes: {
    tutorial: {
      builtin: ["intro", "terminal", "callout", "outro"],
      custom: [] as SceneCatalogEntry[],
    },
    productShort: {
      builtin: ["hero", "benefits", "pricing", "cta"],
    },
  },
}

for (const componentId of Object.keys(customSceneRegistry)) {
  catalog.scenes.tutorial.custom.push({
    componentId,
    composition: "ClaudeCodeTutorial",
    description: `Custom scene: ${componentId}`,
  })
}

// Resolve path relative to project root
const outPath = path.resolve(__dirname, "..", "src", "shared", "scene-catalog.json")
fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2))
console.log(`Scene catalog written to ${outPath} (${catalog.scenes.tutorial.custom.length} custom scenes)`)
