// src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
// IMPORTANT: Remotion bundles at compile time. All custom components
// must be registered here with a static import. NO dynamic imports.

import { type FC } from "react"
import { BeforeAfterScene } from "./scenes/custom/BeforeAfterScene"
import { BigNumberScene } from "./scenes/custom/BigNumberScene"
import { BlockDiagramScene } from "./scenes/custom/BlockDiagramScene"
import { BulletSlideScene } from "./scenes/custom/BulletSlideScene"
import { ChapterCardScene } from "./scenes/custom/ChapterCardScene"
import { CodeBlockScene } from "./scenes/custom/CodeBlockScene"
import { ComparisonTableScene } from "./scenes/custom/ComparisonTableScene"
import { FileExplorerScene } from "./scenes/custom/FileExplorerScene"
import { FlowDiagramScene } from "./scenes/custom/FlowDiagramScene"
import { IconGridScene } from "./scenes/custom/IconGridScene"
import { ProblemSolutionScene } from "./scenes/custom/ProblemSolutionScene"
import { QuoteScene } from "./scenes/custom/QuoteScene"
import { SplitScreenScene } from "./scenes/custom/SplitScreenScene"
import { TimelineScene } from "./scenes/custom/TimelineScene"

export const customSceneRegistry: Record<string, FC<Record<string, unknown>>> = {
  "before-after": BeforeAfterScene,
  "big-number": BigNumberScene,
  "block-diagram": BlockDiagramScene,
  "bullet-slide": BulletSlideScene,
  "chapter-card": ChapterCardScene,
  "code-block": CodeBlockScene,
  "comparison-table": ComparisonTableScene,
  "file-explorer": FileExplorerScene,
  "flow-diagram": FlowDiagramScene,
  "icon-grid": IconGridScene,
  "problem-solution": ProblemSolutionScene,
  quote: QuoteScene,
  "split-screen": SplitScreenScene,
  timeline: TimelineScene,
}
