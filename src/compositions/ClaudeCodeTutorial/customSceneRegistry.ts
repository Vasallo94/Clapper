// src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
// IMPORTANT: Remotion bundles at compile time. All custom components
// must be registered here with a static import. NO dynamic imports.
//
// When the skill generates a custom scene:
//   1. Write the component in scenes/custom/[ComponentName].tsx
//   2. Add: import { ComponentName } from "./scenes/custom/ComponentName"
//   3. Add: "component-name": ComponentName, in the object below

import { type FC } from "react"

export const customSceneRegistry: Record<string, FC<Record<string, unknown>>> = {
  // Example (uncomment when skill generates the component):
  // "my-scene": MyScene,
}
