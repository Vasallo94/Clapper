# Claude Code Memory Video — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 3 new custom scene components (FileExplorerScene, BlockDiagramScene, FlowDiagramScene) and a config.json for a ~4:50 educational video about Claude Code's memory system.

**Architecture:** Each custom component is a standalone `.tsx` file in `scenes/custom/`, registered in `customSceneRegistry.ts`. All components read theme tokens via `useThemeTokens()`, animate with `useCurrentFrame()` + `spring()`/`interpolate()`, and accept props via the custom scene system. The FlowDiagramScene uses `@remotion/paths` for SVG path animations.

**Tech Stack:** React 19, Remotion 4.0.438, `@remotion/paths` (new dep), TypeScript strict, Zod 4

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Install | `@remotion/paths` | SVG path utilities (evolvePath, getPointAtLength) |
| Create | `src/compositions/ClaudeCodeTutorial/scenes/custom/BlockDiagramScene.tsx` | Animated block diagram with connections |
| Create | `src/compositions/ClaudeCodeTutorial/scenes/custom/FileExplorerScene.tsx` | IDE-style file tree + content viewer |
| Create | `src/compositions/ClaudeCodeTutorial/scenes/custom/FlowDiagramScene.tsx` | Flow diagram with animated particle |
| Create | `src/compositions/ClaudeCodeTutorial/scenes/custom/svg-icons.tsx` | Shared SVG icons (folder, file, markdown) |
| Modify | `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts` | Register all 3 components |
| Create | `tutorials/claude-code-memory/config.json` | Full video config (9 scenes) |

---

### Task 1: Install @remotion/paths

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install @remotion/paths@4.0.438
```

- [ ] **Step 2: Verify installation**

```bash
npx tsc --noEmit
```

Expected: clean compile, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @remotion/paths for SVG path animations"
```

---

### Task 2: SVG Icons module

Shared inline SVG icons for the FileExplorerScene. No emojis anywhere.

**Files:**
- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/svg-icons.tsx`

- [ ] **Step 1: Create the SVG icons file**

```tsx
// src/compositions/ClaudeCodeTutorial/scenes/custom/svg-icons.tsx
import React from "react"

interface IconProps {
  size?: number
  color?: string
}

export const FolderIcon: React.FC<IconProps> = ({ size = 16, color = "#61afef" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M1.5 2.5h4.25l1.5 1.5h7.25v9.5h-13v-11z"
      fill={color}
      fillOpacity={0.15}
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
  </svg>
)

export const FileIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3 1.5h6.5L13 5v9.5H3v-13z"
      fill={color}
      fillOpacity={0.08}
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
    <path d="M9.5 1.5V5H13" stroke={color} strokeWidth={1} strokeLinejoin="round" />
  </svg>
)

export const MarkdownIcon: React.FC<IconProps> = ({ size = 16, color = "#98c379" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="10" rx="1.5" stroke={color} strokeWidth={1} />
    <path d="M3.5 10V6l2 2.5L7.5 6v4" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 8.5l1.5 1.5 1.5-1.5" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.5 6v4" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
  </svg>
)

export const ChevronIcon: React.FC<IconProps & { open?: boolean }> = ({ size = 12, color = "#636d83", open = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "none" }}
  >
    <path d="M4 2.5l3.5 3.5L4 9.5" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/svg-icons.tsx
git commit -m "feat: add SVG icon components for custom scenes"
```

---

### Task 3: BlockDiagramScene

Animated blocks with staggered spring entrances and connecting lines. Used in Scene 4 (3-block system overview) and Scene 6a (4-block memory types grid).

**Files:**
- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/BlockDiagramScene.tsx`

- [ ] **Step 1: Create BlockDiagramScene**

```tsx
// src/compositions/ClaudeCodeTutorial/scenes/custom/BlockDiagramScene.tsx
import React from "react"
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { useThemeTokens } from "../../themes"

interface Block {
  id: string
  title: string
  subtitle: string
  color: string
}

interface Connection {
  from: string
  to: string
}

interface BlockDiagramProps {
  blocks: Block[]
  connections?: Connection[]
  layout?: "horizontal" | "grid"
  title?: string
}

export const BlockDiagramScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BlockDiagramProps
  const { blocks = [], connections = [], layout = "horizontal", title } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const isGrid = layout === "grid"
  const cols = isGrid ? 2 : blocks.length
  const staggerDelay = Math.ceil(fps * 0.3)

  // Block positions for connection drawing
  const blockWidth = isGrid ? 280 : 220
  const blockGap = isGrid ? 24 : 40

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        gap: 40,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 28,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: interpolate(frame, [0, fps * 0.4], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {title}
        </div>
      )}

      {/* SVG layer for connection lines */}
      {!isGrid && connections.length > 0 && (
        <svg
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        >
          {connections.map((conn, ci) => {
            const fromIdx = blocks.findIndex((b) => b.id === conn.from)
            const toIdx = blocks.findIndex((b) => b.id === conn.to)
            if (fromIdx === -1 || toIdx === -1) return null

            const totalWidth = blocks.length * blockWidth + (blocks.length - 1) * blockGap
            const startX = (1280 - totalWidth) / 2
            const y = 360 // center Y
            const x1 = startX + fromIdx * (blockWidth + blockGap) + blockWidth
            const x2 = startX + toIdx * (blockWidth + blockGap)

            // Animate line drawing
            const lineDelay = Math.max(fromIdx, toIdx) * staggerDelay + Math.ceil(fps * 0.5)
            const lineProgress = spring({
              frame: Math.max(0, frame - lineDelay),
              fps,
              config: { damping: 200 },
              durationInFrames: Math.ceil(fps * 0.4),
            })

            const currentX2 = interpolate(lineProgress, [0, 1], [x1, x2])

            return (
              <g key={ci}>
                <line
                  x1={x1 + 4}
                  y1={y}
                  x2={currentX2 - 4}
                  y2={y}
                  stroke={tokens.foregroundLow}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                {/* Arrow head */}
                {lineProgress > 0.9 && (
                  <polygon
                    points={`${x2 - 4},${y - 5} ${x2 - 4},${y + 5} ${x2 + 2},${y}`}
                    fill={tokens.foregroundLow}
                    opacity={interpolate(lineProgress, [0.9, 1], [0, 1])}
                  />
                )}
              </g>
            )
          })}
        </svg>
      )}

      {/* Blocks */}
      <div
        style={{
          display: "flex",
          flexWrap: isGrid ? "wrap" : "nowrap",
          gap: blockGap,
          justifyContent: "center",
          maxWidth: isGrid ? cols * blockWidth + blockGap : undefined,
        }}
      >
        {blocks.map((block, i) => {
          const delay = i * staggerDelay
          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.6),
          })
          const y = interpolate(s, [0, 1], [30, 0])
          const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

          return (
            <div
              key={block.id}
              style={{
                width: blockWidth,
                background: tokens.card.bg,
                border: `1px solid ${tokens.card.border}`,
                borderTop: `3px solid ${block.color}`,
                borderRadius: 10,
                padding: "20px 24px",
                opacity,
                transform: `translateY(${y}px)`,
                boxShadow: tokens.card.shadow,
              }}
            >
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 18,
                  fontWeight: 700,
                  color: block.color,
                  marginBottom: 8,
                }}
              >
                {block.title}
              </div>
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 14,
                  color: tokens.foregroundMid,
                  lineHeight: 1.5,
                }}
              >
                {block.subtitle}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/BlockDiagramScene.tsx
git commit -m "feat: add BlockDiagramScene custom component"
```

---

### Task 4: FileExplorerScene

IDE-style file tree on the left, file content panel on the right. Files appear with staggered springs, one file expands to show content with syntax-highlighted frontmatter.

**Files:**
- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/FileExplorerScene.tsx`

- [ ] **Step 1: Create FileExplorerScene**

```tsx
// src/compositions/ClaudeCodeTutorial/scenes/custom/FileExplorerScene.tsx
import React from "react"
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { useThemeTokens } from "../../themes"
import { FolderIcon, MarkdownIcon, ChevronIcon } from "./svg-icons"

interface FileEntry {
  name: string
  type: "file" | "folder"
  indent?: number
  isNew?: boolean
}

interface FileExplorerProps {
  rootPath: string
  files: FileEntry[]
  expandFile: string
  fileContent: string
  calloutText?: string
}

export const FileExplorerScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as FileExplorerProps
  const { rootPath, files = [], expandFile, fileContent = "", calloutText } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const fileStagger = Math.ceil(fps * 0.15)
  const expandStart = files.length * fileStagger + Math.ceil(fps * 0.5)
  const contentRevealDuration = Math.ceil(fps * 1.5)

  // Parse frontmatter vs body from fileContent
  const fmMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  const frontmatter = fmMatch ? fmMatch[1] : ""
  const body = fmMatch ? fmMatch[2].trim() : fileContent

  // Content reveal progress
  const contentProgress = interpolate(
    frame,
    [expandStart, expandStart + contentRevealDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  // Callout animation
  const calloutDelay = expandStart + contentRevealDuration + Math.ceil(fps * 0.3)
  const calloutSpring = spring({
    frame: Math.max(0, frame - calloutDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "row",
        padding: 48,
        gap: 24,
      }}
    >
      {/* File tree panel */}
      <div
        style={{
          width: 360,
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          borderRadius: 10,
          padding: "16px 0",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Root path header */}
        <div
          style={{
            fontFamily: tokens.monoFontFamily,
            fontSize: 11,
            color: tokens.foregroundMid,
            padding: "0 16px 12px",
            borderBottom: `1px solid ${tokens.card.border}`,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ChevronIcon color={tokens.foregroundMid} open />
          {rootPath}
        </div>

        {/* File entries */}
        {files.map((file, i) => {
          const delay = i * fileStagger
          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 200 },
            durationInFrames: Math.ceil(fps * 0.3),
          })
          const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const x = interpolate(s, [0, 1], [-20, 0])

          const isExpanded = file.name === expandFile
          const indent = (file.indent ?? 0) * 16 + 16

          const Icon = file.type === "folder" ? FolderIcon : MarkdownIcon
          const nameColor = file.isNew ? tokens.primary : tokens.foreground
          const bgHighlight = isExpanded && frame >= expandStart
            ? `${tokens.primary}15`
            : "transparent"

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 16px",
                paddingLeft: indent,
                fontFamily: tokens.monoFontFamily,
                fontSize: 13,
                color: nameColor,
                opacity,
                transform: `translateX(${x}px)`,
                background: bgHighlight,
              }}
            >
              <Icon size={16} color={file.type === "folder" ? tokens.primary : tokens.terminal.successColor} />
              <span>{file.name}</span>
              {file.isNew && (
                <span
                  style={{
                    fontSize: 10,
                    color: tokens.terminal.successColor,
                    fontWeight: 700,
                    marginLeft: 4,
                  }}
                >
                  NEW
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* File content panel */}
      <div
        style={{
          flex: 1,
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          opacity: interpolate(frame, [expandStart, expandStart + Math.ceil(fps * 0.3)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {/* File tab */}
        <div
          style={{
            height: 36,
            background: tokens.terminal.titleBar,
            borderBottom: `1px solid ${tokens.card.border}`,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 8,
          }}
        >
          <MarkdownIcon size={14} color={tokens.terminal.successColor} />
          <span
            style={{
              fontFamily: tokens.monoFontFamily,
              fontSize: 12,
              color: tokens.foreground,
            }}
          >
            {expandFile}
          </span>
        </div>

        {/* Content area */}
        <div
          style={{
            padding: "20px 24px",
            fontFamily: tokens.monoFontFamily,
            fontSize: 13,
            lineHeight: 1.7,
            overflow: "hidden",
          }}
        >
          {/* Frontmatter */}
          {frontmatter && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: tokens.foregroundLow }}>---</div>
              {frontmatter.split("\n").map((line, li) => {
                const totalFmLines = frontmatter.split("\n").length
                const lineRevealFrame = expandStart + (li / totalFmLines) * contentRevealDuration * 0.5
                const lineOpacity = interpolate(frame, [lineRevealFrame, lineRevealFrame + 6], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
                const colonIdx = line.indexOf(":")
                const key = colonIdx > 0 ? line.slice(0, colonIdx + 1) : ""
                const val = colonIdx > 0 ? line.slice(colonIdx + 1) : line
                return (
                  <div key={li} style={{ opacity: lineOpacity }}>
                    <span style={{ color: tokens.secondary }}>{key}</span>
                    <span style={{ color: tokens.foreground }}>{val}</span>
                  </div>
                )
              })}
              <div style={{ color: tokens.foregroundLow }}>---</div>
            </div>
          )}

          {/* Body */}
          {body && (
            <div>
              {body.split("\n").map((line, li) => {
                const totalBodyLines = body.split("\n").length
                const lineRevealFrame =
                  expandStart + contentRevealDuration * 0.5 + (li / totalBodyLines) * contentRevealDuration * 0.5
                const lineOpacity = interpolate(frame, [lineRevealFrame, lineRevealFrame + 6], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
                return (
                  <div key={li} style={{ color: tokens.foreground, opacity: lineOpacity }}>
                    {line || "\u00A0"}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Callout overlay */}
      {calloutText && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 48,
            right: 48,
            background: `${tokens.card.bg}ee`,
            border: `1px solid ${tokens.card.border}`,
            borderLeft: `4px solid ${tokens.primary}`,
            borderRadius: 10,
            padding: "16px 24px",
            fontFamily: tokens.fontFamily,
            fontSize: 20,
            color: tokens.foreground,
            fontWeight: 500,
            opacity: calloutSpring,
            transform: `translateY(${interpolate(calloutSpring, [0, 1], [20, 0])}px)`,
            boxShadow: tokens.card.shadow,
          }}
        >
          {calloutText}
        </div>
      )}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/FileExplorerScene.tsx
git commit -m "feat: add FileExplorerScene custom component"
```

---

### Task 5: FlowDiagramScene

Flow diagram with nodes connected by SVG paths, animated data particle, and intro/outro callout text. Uses `@remotion/paths`.

**Files:**
- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/FlowDiagramScene.tsx`

- [ ] **Step 1: Create FlowDiagramScene**

```tsx
// src/compositions/ClaudeCodeTutorial/scenes/custom/FlowDiagramScene.tsx
import React from "react"
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { evolvePath, getPointAtLength, getLength } from "@remotion/paths"
import { useThemeTokens } from "../../themes"

interface FlowNode {
  id: string
  title: string
  description: string
  color: string
}

interface FlowDiagramProps {
  nodes: FlowNode[]
  introText?: string
  outroText?: string
  showParticle?: boolean
  title?: string
}

const NODE_WIDTH = 240
const NODE_HEIGHT = 100
const NODE_GAP = 60
const NODE_Y = 300

export const FlowDiagramScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as FlowDiagramProps
  const { nodes = [], introText, outroText, showParticle = true, title } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const totalWidth = nodes.length * NODE_WIDTH + (nodes.length - 1) * NODE_GAP
  const startX = (1280 - totalWidth) / 2

  // Phase timing
  const introEnd = introText ? Math.ceil(fps * 2.5) : 0
  const nodeStagger = Math.ceil(fps * 0.35)
  const nodesStart = introEnd
  const nodesEnd = nodesStart + nodes.length * nodeStagger + Math.ceil(fps * 0.5)
  const particleStart = nodesEnd + Math.ceil(fps * 0.3)
  const particleDuration = Math.ceil(fps * nodes.length * 0.8)
  const particleEnd = particleStart + particleDuration
  const outroStart = particleEnd + Math.ceil(fps * 0.5)

  // Build SVG path connecting all nodes
  const pathSegments: string[] = []
  for (let i = 0; i < nodes.length - 1; i++) {
    const x1 = startX + i * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH
    const x2 = startX + (i + 1) * (NODE_WIDTH + NODE_GAP)
    const y = NODE_Y + NODE_HEIGHT / 2
    if (i === 0) pathSegments.push(`M ${x1} ${y}`)
    pathSegments.push(`L ${x2} ${y}`)
  }
  const fullPath = pathSegments.join(" ")
  const pathLength = fullPath ? getLength(fullPath) : 0

  // Particle position
  const particleProgress = interpolate(
    frame,
    [particleStart, particleEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  const particlePoint =
    fullPath && pathLength > 0 && showParticle
      ? getPointAtLength(fullPath, particleProgress * pathLength)
      : null

  // Path drawing animation
  const pathDrawProgress = interpolate(
    frame,
    [nodesEnd, nodesEnd + Math.ceil(fps * 0.6)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  // Which node is the particle currently at?
  const activeNodeIndex = Math.floor(particleProgress * nodes.length)

  // Intro text animation
  const introOpacity = introText
    ? interpolate(frame, [0, Math.ceil(fps * 0.4), introEnd - Math.ceil(fps * 0.3), introEnd], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0

  // Outro text animation
  const outroSpring = spring({
    frame: Math.max(0, frame - outroStart),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: 48,
            fontFamily: tokens.fontFamily,
            fontSize: 24,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: interpolate(frame, [nodesStart, nodesStart + Math.ceil(fps * 0.4)], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {title}
        </div>
      )}

      {/* Intro text overlay */}
      {introText && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: tokens.backgroundGradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 80,
            opacity: introOpacity,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 28,
              color: tokens.foreground,
              textAlign: "center",
              maxWidth: 800,
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            {introText}
          </div>
        </div>
      )}

      {/* SVG layer: paths + particle */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1280,
          height: 720,
          pointerEvents: "none",
        }}
      >
        {/* Connection path */}
        {fullPath && pathLength > 0 && (
          <path
            d={fullPath}
            fill="none"
            stroke={tokens.foregroundLow}
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeDashoffset={0}
            style={{
              ...evolvePath(pathDrawProgress, fullPath),
            }}
          />
        )}

        {/* Particle glow */}
        {particlePoint && showParticle && frame >= particleStart && (
          <>
            <circle
              cx={particlePoint.x}
              cy={particlePoint.y}
              r={12}
              fill={tokens.primary}
              opacity={0.3}
            />
            <circle
              cx={particlePoint.x}
              cy={particlePoint.y}
              r={6}
              fill={tokens.primary}
            />
          </>
        )}
      </svg>

      {/* Nodes */}
      <div
        style={{
          position: "absolute",
          top: NODE_Y,
          left: startX,
          display: "flex",
          gap: NODE_GAP,
        }}
      >
        {nodes.map((node, i) => {
          const delay = nodesStart + i * nodeStagger
          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.5),
          })
          const y = interpolate(s, [0, 1], [20, 0])
          const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

          const isActive = frame >= particleStart && i <= activeNodeIndex
          const borderColor = isActive ? node.color : tokens.card.border

          return (
            <div
              key={node.id}
              style={{
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                background: tokens.card.bg,
                border: `2px solid ${borderColor}`,
                borderRadius: 10,
                padding: "14px 18px",
                opacity,
                transform: `translateY(${y}px)`,
                boxShadow: isActive ? `0 0 20px ${node.color}30` : tokens.card.shadow,
              }}
            >
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 15,
                  fontWeight: 700,
                  color: node.color,
                  marginBottom: 6,
                }}
              >
                {node.title}
              </div>
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 12,
                  color: tokens.foregroundMid,
                  lineHeight: 1.4,
                }}
              >
                {node.description}
              </div>
            </div>
          )
        })}
      </div>

      {/* Outro callout */}
      {outroText && frame >= outroStart && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 80,
            right: 80,
            background: `${tokens.card.bg}ee`,
            border: `1px solid ${tokens.card.border}`,
            borderLeft: `4px solid ${tokens.primary}`,
            borderRadius: 10,
            padding: "16px 24px",
            fontFamily: tokens.fontFamily,
            fontSize: 18,
            color: tokens.foreground,
            fontWeight: 500,
            opacity: outroSpring,
            transform: `translateY(${interpolate(outroSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          {outroText}
        </div>
      )}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/FlowDiagramScene.tsx
git commit -m "feat: add FlowDiagramScene custom component with particle animation"
```

---

### Task 6: Register custom components

Wire all 3 components into the registry so they're available to config.json.

**Files:**
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Update the registry**

Replace the entire file content with:

```ts
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
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat: register BlockDiagram, FileExplorer, FlowDiagram in custom scene registry"
```

---

### Task 7: Create config.json for the video

The full video config with 9 scenes (Scene 6 split into 6a and 6b).

**Files:**
- Create: `tutorials/claude-code-memory/config.json`

- [ ] **Step 1: Create the tutorial directory and config**

```bash
mkdir -p tutorials/claude-code-memory
```

Write `tutorials/claude-code-memory/config.json`:

```json
{
  "id": "claude-code-memory",
  "title": "Claude Code recuerda quién eres",
  "description": "Cómo funciona el sistema de memoria de Claude Code: CLAUDE.md, auto memory y auto dream",
  "fps": 30,
  "width": 1280,
  "height": 720,
  "theme": "atom-dark",
  "scenes": [
    {
      "type": "intro",
      "title": "Claude Code recuerda quién eres",
      "subtitle": "Así funciona su sistema de memoria",
      "durationInSeconds": 5
    },
    {
      "type": "terminal",
      "title": "Una conversación sobre telescopios solares",
      "lines": [
        { "kind": "command", "text": "Quiero preparar un setup de astrofotografía solar para el eclipse total de 2026 en España. ¿Qué telescopio me recomiendas?" },
        { "kind": "blank", "text": "", "delayAfterMs": 800 },
        { "kind": "claude", "text": "Para el eclipse total del 12 de agosto de 2026 en España, necesitas un telescopio solar dedicado con filtro H-Alpha." },
        { "kind": "claude", "text": "Te recomiendo el DayStar HelioStar 100Ha — apertura de 100mm, filtro H-Alpha integrado, ideal para prominencias y cromosfera." },
        { "kind": "blank", "text": "", "delayAfterMs": 400 },
        { "kind": "claude", "text": "Para la cámara, la ZWO ASI432MM es excelente para solar: sensor monocromo, alta velocidad de captura, y buen rango dinámico." },
        { "kind": "claude", "text": "Añade una Powermate 2x de TeleVue para aumentar la focal y capturar detalles en las manchas solares." },
        { "kind": "blank", "text": "", "delayAfterMs": 600 },
        { "kind": "command", "text": "Perfecto, voy con HelioStar 100Ha + ASI432MM + Powermate 2x. Lo documento en mi vault." },
        { "kind": "claude", "text": "Buena elección. Es un setup equilibrado para solar: resolución, contraste y portabilidad para el día del eclipse." }
      ],
      "durationInSeconds": 35
    },
    {
      "type": "custom",
      "componentId": "file-explorer",
      "durationInSeconds": 45,
      "props": {
        "rootPath": "~/.claude/projects/.../memory/",
        "files": [
          { "name": "memory", "type": "folder", "indent": 0 },
          { "name": "MEMORY.md", "type": "file", "indent": 1 },
          { "name": "user_astrophotography.md", "type": "file", "indent": 1, "isNew": true }
        ],
        "expandFile": "user_astrophotography.md",
        "fileContent": "---\nname: Astrophotography hobby and equipment\ndescription: User does astrophotography, owns deep-sky setup, planning solar H-Alpha for 2026 eclipse\ntype: user\n---\nEnrique is an astrophotographer with a deep-sky setup\n(ZWO ASI2600MC AIR, FF80-APO refractor, ZWO AM5N mount).\n\nPlanning solar astrophotography for the total solar\neclipse on 2026-08-12 in Spain.\n\nChose HelioStar 100Ha + ASI432MM + Powermate 2x setup.\n\nPrefers practical, well-reasoned recommendations\nbacked by research.",
        "calloutText": "Claude decidió guardar esto. Nadie se lo pidió."
      }
    },
    {
      "type": "custom",
      "componentId": "block-diagram",
      "durationInSeconds": 30,
      "props": {
        "title": "¿Cómo funciona la memoria de Claude Code?",
        "layout": "horizontal",
        "blocks": [
          { "id": "claude-md", "title": "CLAUDE.md", "subtitle": "Instrucciones que tú escribes", "color": "#61afef" },
          { "id": "auto-memory", "title": "Auto Memory", "subtitle": "Notas que Claude toma solo", "color": "#c678dd" },
          { "id": "auto-dream", "title": "Auto Dream", "subtitle": "Consolidación automática", "color": "#d19a66" }
        ],
        "connections": [
          { "from": "claude-md", "to": "auto-memory" },
          { "from": "auto-memory", "to": "auto-dream" }
        ]
      }
    },
    {
      "type": "callout",
      "text": "CLAUDE.md — La versión manual. Archivos markdown donde TÚ le dices a Claude cómo comportarse. Tres alcances: global (~/.claude/), proyecto (./CLAUDE.md), y organización.",
      "position": "top",
      "background": "solid",
      "durationInSeconds": 30
    },
    {
      "type": "custom",
      "componentId": "block-diagram",
      "durationInSeconds": 30,
      "props": {
        "title": "4 tipos de memoria automática",
        "layout": "grid",
        "blocks": [
          { "id": "user", "title": "user", "subtitle": "Es astrofotógrafo, prefiere recomendaciones con investigación", "color": "#61afef" },
          { "id": "feedback", "title": "feedback", "subtitle": "No resumir al final de cada respuesta", "color": "#98c379" },
          { "id": "project", "title": "project", "subtitle": "Merge freeze a partir del 5 de marzo", "color": "#c678dd" },
          { "id": "reference", "title": "reference", "subtitle": "Los bugs se trackean en Linear proyecto INGEST", "color": "#d19a66" }
        ]
      }
    },
    {
      "type": "custom",
      "componentId": "file-explorer",
      "durationInSeconds": 25,
      "props": {
        "rootPath": "~/.claude/projects/.../memory/",
        "files": [
          { "name": "memory", "type": "folder", "indent": 0 },
          { "name": "MEMORY.md", "type": "file", "indent": 1 },
          { "name": "user_astrophotography.md", "type": "file", "indent": 1 },
          { "name": "feedback_no_summaries.md", "type": "file", "indent": 1 },
          { "name": "project_merge_freeze.md", "type": "file", "indent": 1 }
        ],
        "expandFile": "MEMORY.md",
        "fileContent": "- [Astrophotography hobby](user_astrophotography.md) — Deep-sky + solar setup, eclipse 2026\n- [No summaries](feedback_no_summaries.md) — Skip trailing response summaries\n- [Merge freeze](project_merge_freeze.md) — No merges after March 5",
        "calloutText": "Claude lee este índice al empezar cada sesión. Si algo es relevante, abre el archivo completo."
      }
    },
    {
      "type": "custom",
      "componentId": "flow-diagram",
      "durationInSeconds": 75,
      "props": {
        "title": "Auto Dream — El sueño REM de Claude",
        "introText": "Como el sueño REM consolida tu memoria del día, Auto Dream consolida las notas de Claude",
        "showParticle": true,
        "nodes": [
          { "id": "orient", "title": "Orientación", "description": "Inventaría todos los archivos de memoria", "color": "#61afef" },
          { "id": "signal", "title": "Recopilar señal", "description": "Busca correcciones, temas recurrentes", "color": "#98c379" },
          { "id": "consolidate", "title": "Consolidación", "description": "Fusiona duplicados, convierte fechas, elimina obsoletos", "color": "#c678dd" },
          { "id": "prune", "title": "Poda e indexado", "description": "Actualiza MEMORY.md, máx 200 líneas", "color": "#d19a66" }
        ],
        "outroText": "Se activa cuando: han pasado 24h desde la última ejecución + 5 sesiones completadas"
      }
    },
    {
      "type": "outro",
      "title": "La memoria de Claude Code",
      "bullets": [
        "/memory — ver y editar archivos de memoria",
        "/dream — forzar consolidación manual",
        "/init — generar CLAUDE.md inicial",
        "Sígueme para más sobre Claude Code"
      ],
      "durationInSeconds": 15
    }
  ]
}
```

- [ ] **Step 2: Validate the config parses**

```bash
npx tsx -e "
const { readFileSync } = require('fs');
const { TutorialConfigSchema } = require('./src/compositions/ClaudeCodeTutorial/schema');
const config = JSON.parse(readFileSync('tutorials/claude-code-memory/config.json', 'utf-8'));
const result = TutorialConfigSchema.safeParse(config);
if (result.success) { console.log('Config valid. Scenes:', result.data.scenes.length); }
else { console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2)); process.exit(1); }
"
```

Expected: `Config valid. Scenes: 9`

- [ ] **Step 3: Commit**

```bash
git add tutorials/claude-code-memory/config.json
git commit -m "feat: add config.json for Claude Code memory tutorial video"
```

---

### Task 8: Preview and visual QA

Open in Remotion Studio to verify all scenes render correctly.

- [ ] **Step 1: Start Remotion Studio**

```bash
npm run dev
```

Open browser to the Remotion Studio URL (usually http://localhost:3000). Select the `ClaudeCodeTutorial` composition, load the `tutorials/claude-code-memory/config.json` as props.

- [ ] **Step 2: Visual check each scene**

Scrub through the timeline and verify:
- Scene 1 (Intro): title and subtitle animate in with blue→purple accent line
- Scene 2 (Terminal): conversation types out correctly, no text overflow
- Scene 3 (File Explorer): files appear with stagger, `user_astrophotography.md` opens, frontmatter has syntax coloring, callout appears at bottom
- Scene 4 (Block Diagram): 3 blocks appear L→R with connections drawing between them
- Scene 5 (Callout): CLAUDE.md explanation slides in
- Scene 6a (Block Diagram grid): 4 memory type blocks in 2×2 grid
- Scene 6b (File Explorer MEMORY.md): index file opens, callout about session start
- Scene 7 (Flow Diagram): intro text fades, 4 nodes appear, particle travels path, nodes light up, outro callout
- Scene 8 (Outro): title + bullets + CTA stagger in

- [ ] **Step 3: Fix any visual issues found during QA**

Adjust spacing, font sizes, timing, or colors as needed. Commit fixes.

```bash
git add -A
git commit -m "fix: visual adjustments from QA review"
```
