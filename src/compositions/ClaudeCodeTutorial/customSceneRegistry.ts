// src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
// IMPORTANT: Remotion bundles at compile time. All custom components
// must be registered here with a static import. NO dynamic imports.

import { type FC } from "react"
import { BlockDiagramScene } from "./scenes/custom/BlockDiagramScene"
import { FileExplorerScene } from "./scenes/custom/FileExplorerScene"
import { FlowDiagramScene } from "./scenes/custom/FlowDiagramScene"

export const customSceneRegistry: Record<string, FC<Record<string, unknown>>> = {
  "block-diagram": BlockDiagramScene,
  "file-explorer": FileExplorerScene,
  "flow-diagram": FlowDiagramScene,
}
