// src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
// IMPORTANT: Remotion bundles at compile time. All custom components
// must be registered here with a static import. NO dynamic imports.

import { type FC } from "react"
import { BigNumberScene } from "./scenes/custom/BigNumberScene"
import { BlockDiagramScene } from "./scenes/custom/BlockDiagramScene"
import { BulletSlideScene } from "./scenes/custom/BulletSlideScene"
import { CodeBlockScene } from "./scenes/custom/CodeBlockScene"
import { ComparisonTableScene } from "./scenes/custom/ComparisonTableScene"
import { FileExplorerScene } from "./scenes/custom/FileExplorerScene"
import { FlowDiagramScene } from "./scenes/custom/FlowDiagramScene"
import { IconGridScene } from "./scenes/custom/IconGridScene"
import { SectionTitleScene } from "./scenes/custom/SectionTitleScene"
import { SplitScreenScene } from "./scenes/custom/SplitScreenScene"

export const customSceneRegistry: Record<string, FC<Record<string, unknown>>> = {
  "big-number": BigNumberScene,
  "block-diagram": BlockDiagramScene,
  "bullet-slide": BulletSlideScene,
  "code-block": CodeBlockScene,
  "comparison-table": ComparisonTableScene,
  "file-explorer": FileExplorerScene,
  "flow-diagram": FlowDiagramScene,
  "icon-grid": IconGridScene,
  "section-title": SectionTitleScene,
  "split-screen": SplitScreenScene,
}
