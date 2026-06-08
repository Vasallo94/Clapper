# Scene Catalog Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 17 new custom scene components to the horizontal ClaudeCodeTutorial composition, organized in 4 categories (Narrative, Data, Demo, Presentation), and replace `section-title` with `chapter-card`.

**Architecture:** All scenes are custom components registered in `customSceneRegistry.ts`, invoked via `type: "custom"` with `componentId`. Each scene follows the established pattern: `React.FC<Record<string, unknown>>` with internal cast, `useCurrentFrame()`/`spring()`/`interpolate()` for animation, `useThemeTokens()` for theming, and `timing`/`beats` props for voiceover sync.

**Tech Stack:** React, Remotion, TypeScript, Zod (for schema validation in configs)

**Design spec:** `docs/superpowers/specs/2026-04-16-scene-catalog-expansion-design.md`

---

## File Structure

All new files go in `src/compositions/ClaudeCodeTutorial/scenes/custom/`:

```
scenes/custom/
├── BeforeAfterScene.tsx      (NEW — cat.1 narrative)
├── ProblemSolutionScene.tsx   (NEW — cat.1 narrative)
├── TimelineScene.tsx          (NEW — cat.1 narrative)
├── QuoteScene.tsx             (NEW — cat.1 narrative)
├── ChapterCardScene.tsx       (NEW — cat.1 narrative, replaces SectionTitleScene)
├── StatRevealScene.tsx        (NEW — cat.2 data)
├── ProgressBarsScene.tsx      (NEW — cat.2 data)
├── BarChartScene.tsx          (NEW — cat.2 data)
├── CountdownScene.tsx         (NEW — cat.2 data)
├── BrowserMockupScene.tsx     (NEW — cat.3 demo)
├── ApiRequestScene.tsx        (NEW — cat.3 demo)
├── CodeDiffScene.tsx          (NEW — cat.3 demo)
├── AnnotatedImageScene.tsx    (NEW — cat.3 demo)
├── MediaCardScene.tsx         (NEW — cat.4 presentation)
├── LogoWallScene.tsx          (NEW — cat.4 presentation)
├── TwoColumnTextScene.tsx     (NEW — cat.4 presentation)
├── StepListScene.tsx          (NEW — cat.4 presentation)
├── SectionTitleScene.tsx      (DELETE — replaced by ChapterCardScene)
```

Modified files:

- `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts` — add 17 imports + registrations, remove section-title

## Canonical Scene Pattern Reference

Every scene follows this skeleton. Subagents MUST use this exact pattern:

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface MySceneProps {
  // scene-specific props
  timing?: Timing
  beats?: Beat[]
}

export const MyScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as MySceneProps
  const { timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Beat override pattern: beatStartFrames?.[N] ?? computedFallback
  // Bouncy spring config: { damping: 20, stiffness: 180 }
  // Snappy/no-bounce spring config: { damping: 200 }
  // Opacity pattern: interpolate(spring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  return (
    <AbsoluteFill style={{ background: tokens.backgroundGradient }}>
      {/* content */}
      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

## Verification

This project has no unit test infrastructure — verification is done via:

1. `npm run lint` — ESLint + TypeScript check (must pass before every commit)
2. `npm run dev` — Remotion Studio preview (visual check)

---

### Task 1: before-after scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/BeforeAfterScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create BeforeAfterScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface BeforeAfterProps {
  title?: string
  leftLabel?: string
  leftItems: string[]
  rightLabel?: string
  rightItems: string[]
  leftAccent?: string
  rightAccent?: string
  timing?: Timing
  beats?: Beat[]
}

export const BeforeAfterScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BeforeAfterProps
  const {
    title,
    leftLabel = "Before",
    leftItems,
    rightLabel = "After",
    rightItems,
    leftAccent,
    rightAccent,
    timing,
    beats,
  } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const leftColor = leftAccent ?? "#ff5050"
  const rightColor = rightAccent ?? "#50ff78"

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Left panel
  const leftDelay = beatStartFrames?.[1] ?? titleDelay + Math.ceil(fps * 0.3)
  const leftSpring = spring({
    frame: Math.max(0, frame - leftDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.6),
  })
  const leftX = interpolate(leftSpring, [0, 1], [-40, 0])
  const leftOpacity = interpolate(leftSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Arrow
  const arrowDelay = leftDelay + Math.ceil(fps * 0.3)
  const arrowSpring = spring({
    frame: Math.max(0, frame - arrowDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.3),
  })
  const arrowOpacity = interpolate(arrowSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const arrowScale = interpolate(arrowSpring, [0, 1], [0.5, 1])

  // Right panel
  const rightDelay = beatStartFrames?.[2] ?? arrowDelay + Math.ceil(fps * 0.2)
  const rightSpring = spring({
    frame: Math.max(0, frame - rightDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.6),
  })
  const rightX = interpolate(rightSpring, [0, 1], [40, 0])
  const rightOpacity = interpolate(rightSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  const panelStyle = (accent: string): React.CSSProperties => ({
    flex: 1,
    background: tokens.card.bg,
    border: `1px solid ${tokens.card.border}`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: 10,
    padding: "24px 28px",
    boxShadow: tokens.card.shadow,
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 32,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, alignItems: "center", width: "100%" }}>
        {/* Left panel */}
        <div
          style={{
            ...panelStyle(leftColor),
            opacity: leftOpacity,
            transform: `translateX(${leftX}px)`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: leftColor,
              marginBottom: 16,
            }}
          >
            {leftLabel}
          </div>
          {leftItems.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 16,
                color: tokens.foreground,
                fontFamily: tokens.fontFamily,
                lineHeight: 1.6,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: leftColor,
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              {item}
            </div>
          ))}
        </div>

        {/* Arrow */}
        <div
          style={{
            fontSize: 32,
            color: tokens.foregroundMid,
            opacity: arrowOpacity,
            transform: `scale(${arrowScale})`,
            flexShrink: 0,
          }}
        >
          →
        </div>

        {/* Right panel */}
        <div
          style={{
            ...panelStyle(rightColor),
            opacity: rightOpacity,
            transform: `translateX(${rightX}px)`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: rightColor,
              marginBottom: 16,
            }}
          >
            {rightLabel}
          </div>
          {rightItems.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 16,
                color: tokens.foreground,
                fontFamily: tokens.fontFamily,
                lineHeight: 1.6,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: rightColor,
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              {item}
            </div>
          ))}
        </div>
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import at top:

```ts
import { BeforeAfterScene } from "./scenes/custom/BeforeAfterScene"
```

Add to registry object:

```ts
"before-after": BeforeAfterScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/BeforeAfterScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add before-after scene component"
```

---

### Task 2: problem-solution scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/ProblemSolutionScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create ProblemSolutionScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ProblemSolutionProps {
  title?: string
  problem: { icon?: string; text: string }
  solution: { icon?: string; text: string }
  timing?: Timing
  beats?: Beat[]
}

export const ProblemSolutionScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ProblemSolutionProps
  const { title, problem, solution, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const problemColor = "#ff5050"
  const solutionColor = "#50ff78"

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Problem block
  const problemDelay = beatStartFrames?.[1] ?? titleDelay + Math.ceil(fps * 0.3)
  const problemSpring = spring({
    frame: Math.max(0, frame - problemDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const problemX = interpolate(problemSpring, [0, 1], [-30, 0])
  const problemOpacity = interpolate(problemSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Gradient connector
  const lineDelay = problemDelay + Math.ceil(fps * 0.4)
  const lineSpring = spring({
    frame: Math.max(0, frame - lineDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const lineHeight = interpolate(lineSpring, [0, 1], [0, 60])

  // Solution block
  const solutionDelay = beatStartFrames?.[2] ?? lineDelay + Math.ceil(fps * 0.3)
  const solutionSpring = spring({
    frame: Math.max(0, frame - solutionDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const solutionX = interpolate(solutionSpring, [0, 1], [-30, 0])
  const solutionOpacity = interpolate(solutionSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  const blockStyle = (accent: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: tokens.card.bg,
    border: `1px solid ${tokens.card.border}`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: 10,
    padding: "20px 28px",
    boxShadow: tokens.card.shadow,
    maxWidth: 600,
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 40,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      {/* Problem */}
      <div
        style={{
          ...blockStyle(problemColor),
          opacity: problemOpacity,
          transform: `translateX(${problemX}px)`,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: `${problemColor}20`,
            border: `2px solid ${problemColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {problem.icon ?? "⚠"}
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: problemColor,
              marginBottom: 4,
            }}
          >
            Problem
          </div>
          <div style={{ fontSize: 18, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.4 }}>
            {problem.text}
          </div>
        </div>
      </div>

      {/* Gradient connector */}
      <div
        style={{
          width: 3,
          height: lineHeight,
          background: `linear-gradient(${problemColor}, ${solutionColor})`,
          marginLeft: 0,
          overflow: "hidden",
        }}
      />

      {/* Solution */}
      <div
        style={{
          ...blockStyle(solutionColor),
          opacity: solutionOpacity,
          transform: `translateX(${solutionX}px)`,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: `${solutionColor}20`,
            border: `2px solid ${solutionColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {solution.icon ?? "✓"}
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: solutionColor,
              marginBottom: 4,
            }}
          >
            Solution
          </div>
          <div style={{ fontSize: 18, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.4 }}>
            {solution.text}
          </div>
        </div>
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { ProblemSolutionScene } from "./scenes/custom/ProblemSolutionScene"
```

Add to registry:

```ts
"problem-solution": ProblemSolutionScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/ProblemSolutionScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add problem-solution scene component"
```

---

### Task 3: timeline scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/TimelineScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create TimelineScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface TimelineItem {
  date: string
  text: string
  status?: "past" | "current" | "future"
}

interface TimelineProps {
  title?: string
  items: TimelineItem[]
  timing?: Timing
  beats?: Beat[]
}

export const TimelineScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as TimelineProps
  const { title, items, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  const beatOffset = title ? 1 : 0

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 80px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 40,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((item, i) => {
          const itemDelay = beatStartFrames?.[i + beatOffset] ?? motionStartFrame + Math.ceil(fps * 0.3) * (i + 1)
          const itemSpring = spring({
            frame: Math.max(0, frame - itemDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.5),
          })
          const itemOpacity = interpolate(itemSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const itemScale = interpolate(itemSpring, [0, 1], [0.8, 1])

          const status = item.status ?? "past"
          const isFilled = status === "past" || status === "current"
          const nodeColor = isFilled ? tokens.primary : tokens.foregroundLow

          // Pulse for current node
          const pulseSpring = spring({
            frame: Math.max(0, frame - itemDelay - Math.ceil(fps * 0.3)),
            fps,
            config: { damping: 12, stiffness: 100 },
            durationInFrames: Math.ceil(fps * 2),
          })
          const pulseScale = status === "current" ? 1 + interpolate(pulseSpring, [0, 0.5, 1], [0, 0.15, 0]) : 1

          // Connector line
          const lineSpring = spring({
            frame: Math.max(0, frame - itemDelay - Math.ceil(fps * 0.1)),
            fps,
            config: { damping: 200 },
            durationInFrames: Math.ceil(fps * 0.3),
          })
          const lineScaleY = interpolate(lineSpring, [0, 1], [0, 1])

          return (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: itemOpacity }}>
                {/* Node */}
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: isFilled ? nodeColor : "transparent",
                    border: `2px solid ${nodeColor}`,
                    flexShrink: 0,
                    transform: `scale(${itemScale * pulseScale})`,
                    boxShadow: status === "current" ? `0 0 12px ${tokens.primary}60` : "none",
                  }}
                />
                {/* Content */}
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isFilled ? tokens.primary : tokens.foregroundLow,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {item.date}
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      color: isFilled ? tokens.foreground : tokens.foregroundMid,
                      fontFamily: tokens.fontFamily,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.text}
                  </div>
                </div>
              </div>
              {/* Connector line */}
              {i < items.length - 1 && (
                <div
                  style={{
                    width: 2,
                    height: 28,
                    background: tokens.primary,
                    marginLeft: 7,
                    transformOrigin: "top",
                    transform: `scaleY(${lineScaleY})`,
                    opacity: interpolate(lineSpring, [0, 0.3], [0, 0.5], { extrapolateRight: "clamp" }),
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { TimelineScene } from "./scenes/custom/TimelineScene"
```

Add to registry:

```ts
"timeline": TimelineScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/TimelineScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add timeline scene component"
```

---

### Task 4: quote scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/QuoteScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create QuoteScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface QuoteProps {
  text: string
  author?: string
  role?: string
  avatarUrl?: string
  accentColor?: string
  timing?: Timing
  beats?: Beat[]
}

export const QuoteScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as QuoteProps
  const { text, author, role, avatarUrl, accentColor, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const accent = accentColor ?? tokens.primary

  // Quote marks
  const marksDelay = beatStartFrames?.[0] ?? motionStartFrame
  const marksOpacity = interpolate(frame, [marksDelay, marksDelay + Math.ceil(fps * 0.2)], [0, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Quote text
  const textDelay = beatStartFrames?.[1] ?? marksDelay + Math.ceil(fps * 0.15)
  const textSpring = spring({
    frame: Math.max(0, frame - textDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const textOpacity = interpolate(textSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const textScale = interpolate(textSpring, [0, 1], [0.97, 1])

  // Divider line
  const lineDelay = textDelay + Math.ceil(fps * 0.3)
  const lineSpring = spring({
    frame: Math.max(0, frame - lineDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const lineWidth = interpolate(lineSpring, [0, 1], [0, 60])

  // Attribution
  const attrDelay = beatStartFrames?.[2] ?? lineDelay + Math.ceil(fps * 0.15)
  const attrSpring = spring({
    frame: Math.max(0, frame - attrDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const attrOpacity = interpolate(attrSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const attrY = interpolate(attrSpring, [0, 1], [15, 0])

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 100px",
      }}
    >
      {/* Decorative quote marks */}
      <div
        style={{
          fontSize: 120,
          fontFamily: "Georgia, serif",
          color: accent,
          opacity: marksOpacity,
          lineHeight: 0.8,
          marginBottom: -20,
          userSelect: "none",
        }}
      >
        {"\u201C"}
      </div>

      {/* Quote text */}
      <div
        style={{
          fontSize: 28,
          fontStyle: "italic",
          color: tokens.foreground,
          fontFamily: tokens.fontFamily,
          lineHeight: 1.6,
          textAlign: "center",
          maxWidth: 700,
          opacity: textOpacity,
          transform: `scale(${textScale})`,
        }}
      >
        {text}
      </div>

      {/* Divider */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: accent,
          marginTop: 24,
          marginBottom: 24,
        }}
      />

      {/* Attribution */}
      {author && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: attrOpacity,
            transform: `translateY(${attrY}px)`,
          }}
        >
          {avatarUrl && (
            <img src={avatarUrl} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: tokens.foreground, fontFamily: tokens.fontFamily }}>
              {author}
            </div>
            {role && (
              <div style={{ fontSize: 13, color: tokens.foregroundMid, fontFamily: tokens.fontFamily }}>{role}</div>
            )}
          </div>
        </div>
      )}

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { QuoteScene } from "./scenes/custom/QuoteScene"
```

Add to registry:

```ts
"quote": QuoteScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/QuoteScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add quote scene component"
```

---

### Task 5: chapter-card scene (replaces section-title)

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/ChapterCardScene.tsx`
- Delete: `src/compositions/ClaudeCodeTutorial/scenes/custom/SectionTitleScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create ChapterCardScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ChapterCardProps {
  number?: string
  title: string
  subtitle?: string
  description?: string
  timing?: Timing
  beats?: Beat[]
}

export const ChapterCardScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ChapterCardProps
  const { number, title, subtitle, description, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Number background
  const numberDelay = beatStartFrames?.[0] ?? motionStartFrame
  const numberSpring = spring({
    frame: Math.max(0, frame - numberDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const numberOpacity = interpolate(numberSpring, [0, 0.3], [0, 0.15], { extrapolateRight: "clamp" })
  const numberScale = interpolate(numberSpring, [0, 1], [0.8, 1])

  // Title
  const titleDelay = beatStartFrames?.[1] ?? numberDelay + Math.ceil(fps * 0.1)
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Accent line
  const lineDelay = titleDelay + Math.ceil(fps * 0.1)
  const lineProgress = spring({
    frame: Math.max(0, frame - lineDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 80])

  // Subtitle
  const subtitleDelay = beatStartFrames?.[2] ?? lineDelay + Math.ceil(fps * 0.15)
  const subtitleOpacity = interpolate(frame, [subtitleDelay, subtitleDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Description
  const descDelay = beatStartFrames?.[3] ?? subtitleDelay + Math.ceil(fps * 0.15)
  const descOpacity = interpolate(frame, [descDelay, descDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
      {/* Large background number */}
      {number && (
        <div
          style={{
            position: "absolute",
            fontSize: 160,
            fontWeight: 900,
            color: tokens.foreground,
            opacity: numberOpacity,
            transform: `scale(${numberScale})`,
            fontFamily: tokens.fontFamily,
            userSelect: "none",
          }}
        >
          {number}
        </div>
      )}

      {/* Content overlaying the number */}
      <div style={{ position: "relative", textAlign: "center", zIndex: 1 }}>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>

        {/* Accent line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            background: tokens.accentLine,
            margin: "16px auto",
          }}
        />

        {subtitle && (
          <div
            style={{
              fontSize: 20,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
              opacity: subtitleOpacity,
              marginBottom: 12,
            }}
          >
            {subtitle}
          </div>
        )}

        {description && (
          <div
            style={{
              fontSize: 16,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
              opacity: descOpacity,
              maxWidth: 500,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        )}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Update customSceneRegistry.ts**

Remove import:

```ts
import { SectionTitleScene } from "./scenes/custom/SectionTitleScene"
```

Add import:

```ts
import { ChapterCardScene } from "./scenes/custom/ChapterCardScene"
```

Replace in registry:

```ts
// Remove: "section-title": SectionTitleScene,
// Add:
"chapter-card": ChapterCardScene,
```

- [ ] **Step 3: Delete SectionTitleScene.tsx**

```bash
rm src/compositions/ClaudeCodeTutorial/scenes/custom/SectionTitleScene.tsx
```

- [ ] **Step 4: Check for any other references to SectionTitleScene**

Run: `grep -r "SectionTitle\|section-title" src/ --include="*.ts" --include="*.tsx"`

Only the registry should have referenced it. If any tutorial config.json files use `"section-title"`, note them for manual update but do NOT change configs in this task.

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 6: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/ChapterCardScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git rm src/compositions/ClaudeCodeTutorial/scenes/custom/SectionTitleScene.tsx
git commit -m "feat(scenes): add chapter-card scene, replace section-title"
```

---

### Task 6: stat-reveal scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/StatRevealScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create StatRevealScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface StatRevealProps {
  value: number
  suffix?: string
  prefix?: string
  label?: string
  sublabel?: string
  showBar?: boolean
  barPercent?: number
  timing?: Timing
  beats?: Beat[]
}

export const StatRevealScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as StatRevealProps
  const { value, suffix, prefix, label, sublabel, showBar, barPercent, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Label
  const labelDelay = beatStartFrames?.[0] ?? motionStartFrame
  const labelOpacity = interpolate(frame, [labelDelay, labelDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Number counter
  const counterDelay = beatStartFrames?.[1] ?? labelDelay + Math.ceil(fps * 0.15)
  const counterDuration = Math.ceil(fps * 0.8)
  const counterProgress = interpolate(frame, [counterDelay, counterDelay + counterDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const displayValue = Math.round(value * counterProgress)

  // Entrance spring for number
  const numSpring = spring({
    frame: Math.max(0, frame - counterDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const numY = interpolate(numSpring, [0, 1], [30, 0])
  const numOpacity = interpolate(numSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Prefix/suffix bounce
  const affixDelay = counterDelay + Math.ceil(counterDuration * 0.6)
  const affixSpring = spring({
    frame: Math.max(0, frame - affixDelay),
    fps,
    config: { damping: 15, stiffness: 200 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const affixOpacity = interpolate(affixSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const affixScale = interpolate(affixSpring, [0, 1], [0.5, 1])

  // Sublabel
  const subDelay = beatStartFrames?.[2] ?? counterDelay + counterDuration + Math.ceil(fps * 0.1)
  const subOpacity = interpolate(frame, [subDelay, subDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Progress bar
  const barDelay = subDelay + Math.ceil(fps * 0.15)
  const barSpring = spring({
    frame: Math.max(0, frame - barDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const barWidth = interpolate(barSpring, [0, 1], [0, barPercent ?? value])

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
      {/* Label */}
      {label && (
        <div
          style={{
            fontSize: 16,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: labelOpacity,
            marginBottom: 12,
          }}
        >
          {label}
        </div>
      )}

      {/* Number */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          opacity: numOpacity,
          transform: `translateY(${numY}px)`,
        }}
      >
        {prefix && (
          <span
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: tokens.primary,
              fontFamily: tokens.fontFamily,
              opacity: affixOpacity,
              transform: `scale(${affixScale})`,
              display: "inline-block",
            }}
          >
            {prefix}
          </span>
        )}
        <span
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: tokens.primary,
            fontFamily: tokens.fontFamily,
          }}
        >
          {displayValue}
        </span>
        {suffix && (
          <span
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: tokens.primary,
              fontFamily: tokens.fontFamily,
              opacity: affixOpacity,
              transform: `scale(${affixScale})`,
              display: "inline-block",
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Sublabel */}
      {sublabel && (
        <div
          style={{
            fontSize: 18,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: subOpacity,
            marginTop: 8,
          }}
        >
          {sublabel}
        </div>
      )}

      {/* Progress bar */}
      {showBar && (
        <div
          style={{
            width: 240,
            height: 6,
            background: `${tokens.foregroundLow}30`,
            borderRadius: 3,
            marginTop: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${barWidth}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${tokens.primary}, ${tokens.primary}cc)`,
              borderRadius: 3,
            }}
          />
        </div>
      )}

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { StatRevealScene } from "./scenes/custom/StatRevealScene"
```

Add to registry:

```ts
"stat-reveal": StatRevealScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/StatRevealScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add stat-reveal scene component"
```

---

### Task 7: progress-bars scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/ProgressBarsScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create ProgressBarsScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ProgressBarItem {
  label: string
  value: number
  color?: string
}

interface ProgressBarsProps {
  title?: string
  items: ProgressBarItem[]
  timing?: Timing
  beats?: Beat[]
}

export const ProgressBarsScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ProgressBarsProps
  const { title, items, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  const beatOffset = title ? 1 : 0

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 100px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 36,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((item, i) => {
          const barDelay =
            beatStartFrames?.[i + beatOffset] ?? motionStartFrame + Math.ceil(fps * 0.3) + i * Math.ceil(fps * 0.25)
          const barSpring = spring({
            frame: Math.max(0, frame - barDelay),
            fps,
            config: { damping: 200 },
            durationInFrames: Math.ceil(fps * 0.6),
          })
          const barFill = interpolate(barSpring, [0, 1], [0, item.value])
          const labelOpacity = interpolate(frame, [barDelay - Math.ceil(fps * 0.1), barDelay], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
          const barColor = item.color ?? tokens.primary
          const displayPercent = Math.round(barFill)

          return (
            <div key={i} style={{ opacity: labelOpacity }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  fontFamily: tokens.fontFamily,
                }}
              >
                <span style={{ fontSize: 15, color: tokens.foreground }}>{item.label}</span>
                <span style={{ fontSize: 15, color: tokens.foregroundMid }}>{displayPercent}%</span>
              </div>
              <div
                style={{
                  height: 28,
                  background: `${tokens.foregroundLow}20`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${barFill}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { ProgressBarsScene } from "./scenes/custom/ProgressBarsScene"
```

Add to registry:

```ts
"progress-bars": ProgressBarsScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/ProgressBarsScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add progress-bars scene component"
```

---

### Task 8: bar-chart scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/BarChartScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create BarChartScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface BarChartItem {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  title?: string
  items: BarChartItem[]
  highlightIndex?: number
  showValues?: boolean
  timing?: Timing
  beats?: Beat[]
}

export const BarChartScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BarChartProps
  const { title, items, highlightIndex, showValues = true, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const maxValue = Math.max(...items.map((d) => d.value), 1)
  const chartHeight = 280
  const barWidth = Math.min(60, Math.floor(500 / items.length))

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Baseline
  const baseDelay = (title ? beatStartFrames?.[1] : beatStartFrames?.[0]) ?? motionStartFrame + Math.ceil(fps * 0.3)
  const baseOpacity = interpolate(frame, [baseDelay, baseDelay + Math.ceil(fps * 0.15)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const beatOffset = title ? 2 : 1

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 32,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ position: "relative", height: chartHeight + 40 }}>
        {/* Bars */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: Math.max(12, 24 - items.length * 2),
            height: chartHeight,
          }}
        >
          {items.map((item, i) => {
            const barDelay = beatStartFrames?.[i + beatOffset] ?? baseDelay + Math.ceil(fps * 0.15) * (i + 1)
            const barSpring = spring({
              frame: Math.max(0, frame - barDelay),
              fps,
              config: { damping: 20, stiffness: 180 },
              durationInFrames: Math.ceil(fps * 0.5),
            })
            const barHeight = interpolate(barSpring, [0, 1], [0, (item.value / maxValue) * chartHeight])
            const barOpacity = interpolate(barSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

            const isHighlighted = highlightIndex === i
            const barColor = item.color ?? (isHighlighted ? tokens.primary : tokens.secondary)

            const displayValue = Math.round(item.value * interpolate(barSpring, [0, 1], [0, 1]))

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                {/* Value label */}
                {showValues && (
                  <div
                    style={{
                      fontSize: 13,
                      color: tokens.foreground,
                      fontFamily: tokens.monoFontFamily,
                      opacity: barOpacity,
                    }}
                  >
                    {displayValue}
                  </div>
                )}
                {/* Bar */}
                <div
                  style={{
                    width: barWidth,
                    height: barHeight,
                    background: `linear-gradient(0deg, ${barColor}, ${barColor}cc)`,
                    borderRadius: "4px 4px 0 0",
                    opacity: barOpacity,
                  }}
                />
                {/* Label */}
                <div
                  style={{
                    fontSize: 12,
                    color: tokens.foregroundMid,
                    fontFamily: tokens.fontFamily,
                    opacity: barOpacity,
                    textAlign: "center",
                    maxWidth: barWidth + 20,
                  }}
                >
                  {item.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Baseline */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: -10,
            right: -10,
            height: 1,
            background: tokens.foregroundLow,
            opacity: baseOpacity,
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { BarChartScene } from "./scenes/custom/BarChartScene"
```

Add to registry:

```ts
"bar-chart": BarChartScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/BarChartScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add bar-chart scene component"
```

---

### Task 9: countdown scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/CountdownScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create CountdownScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface CountdownProps {
  title?: string
  targetLabel?: string
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
  timing?: Timing
  beats?: Beat[]
}

export const CountdownScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as CountdownProps
  const { title, targetLabel, days = 0, hours = 0, minutes = 0, seconds = 0, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Total seconds and countdown
  const totalStartSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds
  const elapsedSeconds = Math.max(0, (frame - motionStartFrame) / fps)
  const remaining = Math.max(0, totalStartSeconds - elapsedSeconds)

  const d = Math.floor(remaining / 86400)
  const h = Math.floor((remaining % 86400) / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = Math.floor(remaining % 60)

  const segments: { value: number; label: string }[] = []
  if (days > 0) segments.push({ value: d, label: "DAYS" })
  if (days > 0 || hours > 0) segments.push({ value: h, label: "HOURS" })
  segments.push({ value: m, label: "MINS" })
  segments.push({ value: s, label: "SECS" })

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleOpacity = interpolate(frame, [titleDelay, titleDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Target label
  const labelDelay = beatStartFrames?.[2] ?? motionStartFrame + Math.ceil(fps * 0.6)
  const labelOpacity = interpolate(frame, [labelDelay, labelDelay + Math.ceil(fps * 0.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
      {title && (
        <div
          style={{
            fontSize: 18,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: titleOpacity,
            marginBottom: 24,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {segments.map((seg, i) => {
          const boxDelay = beatStartFrames?.[1] ?? motionStartFrame + Math.ceil(fps * 0.15) + i * Math.ceil(fps * 0.1)
          const boxSpring = spring({
            frame: Math.max(0, frame - boxDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.4),
          })
          const boxScale = interpolate(boxSpring, [0, 1], [0.7, 1])
          const boxOpacity = interpolate(boxSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

          const isLast = i === segments.length - 1

          return (
            <React.Fragment key={i}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: boxOpacity,
                  transform: `scale(${boxScale})`,
                }}
              >
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 900,
                    color: isLast ? tokens.primary : tokens.foreground,
                    fontFamily: tokens.monoFontFamily,
                    background: tokens.card.bg,
                    border: `1px solid ${isLast ? tokens.primary : tokens.card.border}`,
                    borderRadius: 10,
                    padding: "8px 20px",
                    minWidth: 80,
                    textAlign: "center",
                    boxShadow: tokens.card.shadow,
                  }}
                >
                  {String(seg.value).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: tokens.foregroundMid,
                    fontFamily: tokens.fontFamily,
                    letterSpacing: 1.5,
                  }}
                >
                  {seg.label}
                </div>
              </div>
              {i < segments.length - 1 && (
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    color: tokens.foregroundLow,
                    fontFamily: tokens.monoFontFamily,
                    marginBottom: 24,
                    opacity: boxOpacity,
                  }}
                >
                  :
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {targetLabel && (
        <div
          style={{
            fontSize: 18,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: labelOpacity,
            marginTop: 28,
          }}
        >
          {targetLabel}
        </div>
      )}

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { CountdownScene } from "./scenes/custom/CountdownScene"
```

Add to registry:

```ts
"countdown": CountdownScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/CountdownScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add countdown scene component"
```

---

### Task 10: browser-mockup scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/BrowserMockupScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create BrowserMockupScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ContentBlock {
  type: "header" | "card-row" | "text" | "placeholder" | "button"
  text?: string
}

interface BrowserMockupProps {
  url: string
  title?: string
  variant?: "light" | "dark"
  content: ContentBlock[]
  timing?: Timing
  beats?: Beat[]
}

export const BrowserMockupScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BrowserMockupProps
  const { url, title, variant = "light", content, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const isLight = variant === "light"
  const pageBg = isLight ? "#ffffff" : "#1e1e2e"
  const pageText = isLight ? "#333333" : "#cccccc"
  const blockBg = isLight ? "#f0f0f0" : "#2a2a3a"

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Chrome
  const chromeDelay = (title ? beatStartFrames?.[1] : beatStartFrames?.[0]) ?? motionStartFrame + Math.ceil(fps * 0.2)
  const chromeOpacity = interpolate(frame, [chromeDelay, chromeDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // URL typewriter
  const urlDelay = chromeDelay + Math.ceil(fps * 0.15)
  const urlChars = Math.floor(
    interpolate(frame, [urlDelay, urlDelay + Math.ceil(fps * 0.4)], [0, url.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  )

  const beatOffset = title ? 2 : 1

  const renderBlock = (block: ContentBlock, i: number) => {
    const blockDelay = beatStartFrames?.[i + beatOffset] ?? urlDelay + Math.ceil(fps * 0.3) + i * Math.ceil(fps * 0.15)
    const blockOpacity = interpolate(frame, [blockDelay, blockDelay + Math.ceil(fps * 0.15)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })

    const base: React.CSSProperties = { opacity: blockOpacity, borderRadius: 4 }

    switch (block.type) {
      case "header":
        return (
          <div
            key={i}
            style={{
              ...base,
              background: blockBg,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 600,
              color: pageText,
            }}
          >
            {block.text ?? "Header"}
          </div>
        )
      case "card-row":
        return (
          <div key={i} style={{ ...base, display: "flex", gap: 10 }}>
            {[0, 1, 2].map((j) => (
              <div key={j} style={{ flex: 1, background: blockBg, borderRadius: 4, height: 48 }} />
            ))}
          </div>
        )
      case "text":
        return (
          <div key={i} style={{ ...base, fontSize: 13, color: pageText, lineHeight: 1.6, padding: "4px 0" }}>
            {block.text ?? "Text content placeholder"}
          </div>
        )
      case "placeholder":
        return <div key={i} style={{ ...base, background: blockBg, height: 36 }} />
      case "button":
        return (
          <div key={i} style={{ ...base }}>
            <div
              style={{
                display: "inline-block",
                background: tokens.primary,
                color: tokens.primaryForeground,
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 20px",
                borderRadius: 4,
              }}
            >
              {block.text ?? "Button"}
            </div>
          </div>
        )
      default:
        return <div key={i} style={{ ...base, background: blockBg, height: 30 }} />
    }
  }

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 80px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 20,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: "10px 10px 8px 8px",
          overflow: "hidden",
          boxShadow: tokens.card.shadow,
          opacity: chromeOpacity,
        }}
      >
        {/* Browser chrome */}
        <div
          style={{
            background: "#2a2a2a",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
          </div>
          <div
            style={{
              flex: 1,
              background: "#1a1a1a",
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 12,
              color: "#888",
              fontFamily: tokens.monoFontFamily,
            }}
          >
            {url.slice(0, urlChars)}
            {urlChars < url.length && <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>|</span>}
          </div>
        </div>

        {/* Page content */}
        <div
          style={{
            background: pageBg,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minHeight: 180,
          }}
        >
          {content.map(renderBlock)}
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { BrowserMockupScene } from "./scenes/custom/BrowserMockupScene"
```

Add to registry:

```ts
"browser-mockup": BrowserMockupScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/BrowserMockupScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add browser-mockup scene component"
```

---

### Task 11: api-request scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/ApiRequestScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create ApiRequestScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ApiRequestProps {
  title?: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  endpoint: string
  requestBody?: string
  responseStatus: number
  responseBody: string
  language?: "json" | "curl"
  timing?: Timing
  beats?: Beat[]
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#50ff78",
  POST: "#58a6ff",
  PUT: "#febc2e",
  DELETE: "#ff5f57",
  PATCH: "#d2a8ff",
}

export const ApiRequestScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ApiRequestProps
  const { title, method, endpoint, requestBody, responseStatus, responseBody, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const methodColor = METHOD_COLORS[method] ?? tokens.primary
  const statusColor = responseStatus < 400 ? "#50ff78" : "#ff5f57"

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Method badge
  const badgeDelay = beatStartFrames?.[1] ?? motionStartFrame + Math.ceil(fps * 0.2)
  const badgeSpring = spring({
    frame: Math.max(0, frame - badgeDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.3),
  })
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1])
  const badgeOpacity = interpolate(badgeSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Request panel
  const reqDelay = beatStartFrames?.[2] ?? badgeDelay + Math.ceil(fps * 0.2)
  const reqLines = [endpoint, ...(requestBody?.split("\n") ?? [])]
  const reqDuration = Math.ceil(fps * 0.5)

  // Arrow
  const arrowDelay = reqDelay + reqDuration
  const arrowSpring = spring({
    frame: Math.max(0, frame - arrowDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.3),
  })
  const arrowOpacity = interpolate(arrowSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Response panel
  const resDelay = beatStartFrames?.[3] ?? arrowDelay + Math.ceil(fps * 0.2)
  const resLines = [`${responseStatus} ${responseStatus < 400 ? "OK" : "Error"}`, ...responseBody.split("\n")]
  const resDuration = Math.ceil(fps * 0.5)

  const panelStyle: React.CSSProperties = {
    flex: 1,
    background: "#0d1117",
    border: `1px solid ${tokens.card.border}`,
    borderRadius: 8,
    padding: 14,
    fontFamily: tokens.monoFontFamily,
    fontSize: 12,
    overflow: "hidden",
  }

  const renderLines = (lines: string[], delay: number, duration: number) => {
    const lineGap = duration / Math.max(lines.length, 1)
    return lines.map((line, i) => {
      const lineFrame = delay + i * lineGap
      const lineOpacity = interpolate(frame, [lineFrame, lineFrame + 8], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      return (
        <div key={i} style={{ color: tokens.foreground, opacity: lineOpacity, lineHeight: 1.6 }}>
          {line}
        </div>
      )
    })
  }

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 60px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 20,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", width: "100%", maxWidth: 800 }}>
        {/* Request */}
        <div style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: methodColor,
                background: `${methodColor}20`,
                padding: "2px 8px",
                borderRadius: 4,
                opacity: badgeOpacity,
                transform: `scale(${badgeScale})`,
                display: "inline-block",
              }}
            >
              {method}
            </div>
            <div style={{ fontSize: 10, color: "#50ff78", textTransform: "uppercase", letterSpacing: 1 }}>Request</div>
          </div>
          {renderLines(reqLines, reqDelay, reqDuration)}
        </div>

        {/* Arrow */}
        <div
          style={{
            fontSize: 28,
            color: tokens.foregroundLow,
            opacity: arrowOpacity,
            marginTop: 60,
            flexShrink: 0,
          }}
        >
          →
        </div>

        {/* Response */}
        <div style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: statusColor,
                background: `${statusColor}20`,
                padding: "2px 8px",
                borderRadius: 4,
                opacity: interpolate(frame, [resDelay, resDelay + 6], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                display: "inline-block",
              }}
            >
              {responseStatus}
            </div>
            <div style={{ fontSize: 10, color: "#58a6ff", textTransform: "uppercase", letterSpacing: 1 }}>Response</div>
          </div>
          {renderLines(resLines.slice(1), resDelay + 6, resDuration)}
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { ApiRequestScene } from "./scenes/custom/ApiRequestScene"
```

Add to registry:

```ts
"api-request": ApiRequestScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/ApiRequestScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add api-request scene component"
```

---

### Task 12: code-diff scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/CodeDiffScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create CodeDiffScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface CodeDiffProps {
  fileName: string
  additions: string[]
  deletions: string[]
  context?: { before?: string[]; after?: string[] }
  title?: string
  timing?: Timing
  beats?: Beat[]
}

export const CodeDiffScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as CodeDiffProps
  const { fileName, additions, deletions, context, title, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Header
  const headerDelay = (title ? beatStartFrames?.[1] : beatStartFrames?.[0]) ?? motionStartFrame + Math.ceil(fps * 0.2)
  const headerOpacity = interpolate(frame, [headerDelay, headerDelay + Math.ceil(fps * 0.15)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Build line list with types
  type DiffLine = { text: string; type: "context" | "deletion" | "addition" }
  const lines: DiffLine[] = [
    ...(context?.before ?? []).map((t): DiffLine => ({ text: t, type: "context" })),
    ...deletions.map((t): DiffLine => ({ text: t, type: "deletion" })),
    ...additions.map((t): DiffLine => ({ text: t, type: "addition" })),
    ...(context?.after ?? []).map((t): DiffLine => ({ text: t, type: "context" })),
  ]

  const linesStartDelay = headerDelay + Math.ceil(fps * 0.2)
  const beatOffset = title ? 2 : 1

  const lineColors: Record<string, { bg: string; text: string; prefix: string }> = {
    context: { bg: "transparent", text: tokens.foreground, prefix: " " },
    deletion: { bg: "rgba(255,80,80,0.12)", text: "#ffa0a0", prefix: "-" },
    addition: { bg: "rgba(80,255,120,0.10)", text: "#7ee787", prefix: "+" },
  }

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 80px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 20,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${tokens.card.border}`,
          boxShadow: tokens.card.shadow,
          opacity: headerOpacity,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: tokens.terminal.titleBar,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: `1px solid ${tokens.card.border}`,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: tokens.foreground,
              fontFamily: tokens.monoFontFamily,
            }}
          >
            {fileName}
          </span>
          <span
            style={{
              fontSize: 11,
              color: tokens.foregroundMid,
              background: `${tokens.foregroundLow}20`,
              padding: "2px 8px",
              borderRadius: 10,
              fontFamily: tokens.monoFontFamily,
            }}
          >
            +{additions.length} -{deletions.length}
          </span>
        </div>

        {/* Diff lines */}
        <div style={{ background: tokens.terminal.bg, padding: 0 }}>
          {lines.map((line, i) => {
            const lineDelay =
              beatStartFrames?.[i + beatOffset] ??
              linesStartDelay + (line.type === "context" ? 0 : i * Math.ceil(fps * 0.15))
            const lineOpacity =
              line.type === "context"
                ? headerOpacity
                : interpolate(frame, [lineDelay, lineDelay + 8], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })

            const colors = lineColors[line.type]

            return (
              <div
                key={i}
                style={{
                  padding: "3px 14px",
                  background: colors.bg,
                  fontFamily: tokens.monoFontFamily,
                  fontSize: 13,
                  color: colors.text,
                  opacity: lineOpacity,
                  display: "flex",
                  gap: 8,
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: tokens.foregroundLow, width: 12, flexShrink: 0 }}>{colors.prefix}</span>
                <span>{line.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { CodeDiffScene } from "./scenes/custom/CodeDiffScene"
```

Add to registry:

```ts
"code-diff": CodeDiffScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/CodeDiffScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add code-diff scene component"
```

---

### Task 13: annotated-image scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/AnnotatedImageScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create AnnotatedImageScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface Annotation {
  x: number
  y: number
  text: string
  position?: "top" | "bottom" | "left" | "right"
}

interface AnnotatedImageProps {
  imageSrc?: string
  imageAlt?: string
  annotations: Annotation[]
  timing?: Timing
  beats?: Beat[]
}

export const AnnotatedImageScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as AnnotatedImageProps
  const { imageSrc, imageAlt, annotations, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Image entrance
  const imgDelay = beatStartFrames?.[0] ?? motionStartFrame
  const imgSpring = spring({
    frame: Math.max(0, frame - imgDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const imgOpacity = interpolate(imgSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const imgScale = interpolate(imgSpring, [0, 1], [0.97, 1])

  const getCalloutOffset = (pos: string) => {
    switch (pos) {
      case "top":
        return { top: "auto", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
      case "bottom":
        return { top: "calc(100% + 8px)", bottom: "auto", left: "50%", transform: "translateX(-50%)" }
      case "left":
        return { top: "50%", right: "calc(100% + 8px)", left: "auto", transform: "translateY(-50%)" }
      case "right":
        return { top: "50%", left: "calc(100% + 8px)", right: "auto", transform: "translateY(-50%)" }
      default:
        return { top: "calc(100% + 8px)", bottom: "auto", left: "50%", transform: "translateX(-50%)" }
    }
  }

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
      }}
    >
      <div
        style={{
          position: "relative",
          opacity: imgOpacity,
          transform: `scale(${imgScale})`,
          maxWidth: 900,
          width: "100%",
        }}
      >
        {/* Image or placeholder */}
        {imageSrc ? (
          <Img
            src={imageSrc}
            style={{
              width: "100%",
              borderRadius: 10,
              border: `1px solid ${tokens.card.border}`,
              boxShadow: tokens.card.shadow,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: 360,
              background: tokens.card.bg,
              borderRadius: 10,
              border: `1px solid ${tokens.card.border}`,
              boxShadow: tokens.card.shadow,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
            }}
          >
            {imageAlt ?? "Image placeholder"}
          </div>
        )}

        {/* Annotations */}
        {annotations.map((ann, i) => {
          const annDelay = beatStartFrames?.[i + 1] ?? imgDelay + Math.ceil(fps * 0.4) * (i + 1)
          const annSpring = spring({
            frame: Math.max(0, frame - annDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.4),
          })
          const annOpacity = interpolate(annSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const annScale = interpolate(annSpring, [0, 1], [0.5, 1])

          const pos = ann.position ?? "bottom"
          const offset = getCalloutOffset(pos)

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${ann.x}%`,
                top: `${ann.y}%`,
                opacity: annOpacity,
                transform: `scale(${annScale})`,
                zIndex: 10 + i,
              }}
            >
              {/* Number circle */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: tokens.primary,
                  color: tokens.primaryForeground,
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: tokens.fontFamily,
                  position: "relative",
                }}
              >
                {i + 1}
                {/* Callout bubble */}
                <div
                  style={{
                    position: "absolute",
                    ...offset,
                    background: tokens.primary,
                    color: tokens.primaryForeground,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "5px 12px",
                    borderRadius: 4,
                    whiteSpace: "nowrap",
                    fontFamily: tokens.fontFamily,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  {ann.text}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { AnnotatedImageScene } from "./scenes/custom/AnnotatedImageScene"
```

Add to registry:

```ts
"annotated-image": AnnotatedImageScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/AnnotatedImageScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add annotated-image scene component"
```

---

### Task 14: media-card scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/MediaCardScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create MediaCardScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface MediaCardProps {
  imageSrc?: string
  imageAlt?: string
  title: string
  description?: string
  cta?: string
  layout?: "image-left" | "image-right"
  timing?: Timing
  beats?: Beat[]
}

export const MediaCardScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as MediaCardProps
  const { imageSrc, imageAlt, title, description, cta, layout = "image-left", timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const isRight = layout === "image-right"

  // Image
  const imgDelay = beatStartFrames?.[0] ?? motionStartFrame
  const imgSpring = spring({
    frame: Math.max(0, frame - imgDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const imgOpacity = interpolate(imgSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const imgScale = interpolate(imgSpring, [0, 1], [0.95, 1])

  // Title
  const titleDelay = beatStartFrames?.[1] ?? imgDelay + Math.ceil(fps * 0.2)
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [15, 0])

  // Description
  const descDelay = beatStartFrames?.[2] ?? titleDelay + Math.ceil(fps * 0.15)
  const descOpacity = interpolate(frame, [descDelay, descDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // CTA
  const ctaDelay = beatStartFrames?.[3] ?? descDelay + Math.ceil(fps * 0.15)
  const ctaSpring = spring({
    frame: Math.max(0, frame - ctaDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const ctaOpacity = interpolate(ctaSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const ctaY = interpolate(ctaSpring, [0, 1], [10, 0])

  const imageEl = (
    <div
      style={{
        flex: 1,
        opacity: imgOpacity,
        transform: `scale(${imgScale})`,
      }}
    >
      {imageSrc ? (
        <Img
          src={imageSrc}
          style={{
            width: "100%",
            height: 240,
            objectFit: "cover",
            borderRadius: 10,
            border: `1px solid ${tokens.card.border}`,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 240,
            background: tokens.card.bg,
            borderRadius: 10,
            border: `1px solid ${tokens.card.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
          }}
        >
          {imageAlt ?? "Image"}
        </div>
      )}
    </div>
  )

  const textEl = (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: tokens.foreground,
          fontFamily: tokens.fontFamily,
          marginBottom: 12,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 16,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            lineHeight: 1.6,
            opacity: descOpacity,
            marginBottom: 20,
          }}
        >
          {description}
        </div>
      )}
      {cta && (
        <div
          style={{
            display: "inline-block",
            background: tokens.primary,
            color: tokens.primaryForeground,
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 24px",
            borderRadius: 6,
            fontFamily: tokens.fontFamily,
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
          }}
        >
          {cta}
        </div>
      )}
    </div>
  )

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 80px",
      }}
    >
      <div style={{ display: "flex", gap: 40, alignItems: "center", width: "100%" }}>
        {isRight ? (
          <>
            {textEl}
            {imageEl}
          </>
        ) : (
          <>
            {imageEl}
            {textEl}
          </>
        )}
      </div>
      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { MediaCardScene } from "./scenes/custom/MediaCardScene"
```

Add to registry:

```ts
"media-card": MediaCardScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/MediaCardScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add media-card scene component"
```

---

### Task 15: logo-wall scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/LogoWallScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create LogoWallScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface LogoItem {
  src?: string
  label?: string
}

interface LogoWallProps {
  title?: string
  items: LogoItem[]
  columns?: 3 | 4 | 6
  timing?: Timing
  beats?: Beat[]
}

export const LogoWallScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as LogoWallProps
  const { title, items, columns, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const cols = columns ?? (items.length <= 3 ? 3 : items.length <= 8 ? 4 : 6)
  const cellWidth = cols === 6 ? 120 : cols === 4 ? 140 : 180

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleOpacity = interpolate(frame, [titleDelay, titleDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const beatOffset = title ? 1 : 0

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 20,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: titleOpacity,
            marginBottom: 32,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 20,
          maxWidth: (cellWidth + 20) * cols,
        }}
      >
        {items.map((item, i) => {
          const cellDelay =
            beatStartFrames?.[i + beatOffset] ?? motionStartFrame + Math.ceil(fps * 0.2) + i * Math.ceil(fps * 0.1)
          const cellSpring = spring({
            frame: Math.max(0, frame - cellDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.4),
          })
          const cellOpacity = interpolate(cellSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const cellScale = interpolate(cellSpring, [0, 1], [0.7, 1])

          return (
            <div
              key={i}
              style={{
                width: cellWidth,
                height: 60,
                background: tokens.card.bg,
                border: `1px solid ${tokens.card.border}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: cellOpacity,
                transform: `scale(${cellScale})`,
              }}
            >
              {item.src ? (
                <Img src={item.src} style={{ maxWidth: cellWidth - 24, maxHeight: 36, objectFit: "contain" }} />
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    color: tokens.foregroundMid,
                    fontFamily: tokens.fontFamily,
                    fontWeight: 500,
                  }}
                >
                  {item.label ?? "Logo"}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { LogoWallScene } from "./scenes/custom/LogoWallScene"
```

Add to registry:

```ts
"logo-wall": LogoWallScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/LogoWallScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add logo-wall scene component"
```

---

### Task 16: two-column-text scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/TwoColumnTextScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create TwoColumnTextScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ColumnContent {
  title: string
  body: string
}

interface TwoColumnTextProps {
  title?: string
  left: ColumnContent
  right: ColumnContent
  timing?: Timing
  beats?: Beat[]
}

export const TwoColumnTextScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as TwoColumnTextProps
  const { title, left, right, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Left column
  const leftDelay = beatStartFrames?.[1] ?? motionStartFrame + Math.ceil(fps * 0.3)
  const leftSpring = spring({
    frame: Math.max(0, frame - leftDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const leftX = interpolate(leftSpring, [0, 1], [-25, 0])
  const leftOpacity = interpolate(leftSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Separator
  const sepDelay = leftDelay + Math.ceil(fps * 0.2)
  const sepSpring = spring({
    frame: Math.max(0, frame - sepDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const sepHeight = interpolate(sepSpring, [0, 1], [0, 100])
  const sepOpacity = interpolate(sepSpring, [0, 0.3], [0, 0.3], { extrapolateRight: "clamp" })

  // Right column
  const rightDelay = beatStartFrames?.[2] ?? sepDelay + Math.ceil(fps * 0.15)
  const rightSpring = spring({
    frame: Math.max(0, frame - rightDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const rightX = interpolate(rightSpring, [0, 1], [25, 0])
  const rightOpacity = interpolate(rightSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 80px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 36,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 32, alignItems: "center", width: "100%" }}>
        {/* Left */}
        <div
          style={{
            flex: 1,
            opacity: leftOpacity,
            transform: `translateX(${leftX}px)`,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: tokens.foreground,
              fontFamily: tokens.fontFamily,
              marginBottom: 12,
            }}
          >
            {left.title}
          </div>
          <div
            style={{
              fontSize: 15,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
              lineHeight: 1.7,
            }}
          >
            {left.body}
          </div>
        </div>

        {/* Separator */}
        <div
          style={{
            width: 1,
            height: `${sepHeight}%`,
            background: tokens.foregroundLow,
            opacity: sepOpacity,
            flexShrink: 0,
          }}
        />

        {/* Right */}
        <div
          style={{
            flex: 1,
            opacity: rightOpacity,
            transform: `translateX(${rightX}px)`,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: tokens.foreground,
              fontFamily: tokens.fontFamily,
              marginBottom: 12,
            }}
          >
            {right.title}
          </div>
          <div
            style={{
              fontSize: 15,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
              lineHeight: 1.7,
            }}
          >
            {right.body}
          </div>
        </div>
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { TwoColumnTextScene } from "./scenes/custom/TwoColumnTextScene"
```

Add to registry:

```ts
"two-column-text": TwoColumnTextScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/TwoColumnTextScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add two-column-text scene component"
```

---

### Task 17: step-list scene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/StepListScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Create StepListScene.tsx**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface Step {
  title: string
  description?: string
  status?: "completed" | "current" | "pending"
}

interface StepListProps {
  title?: string
  steps: Step[]
  timing?: Timing
  beats?: Beat[]
}

export const StepListScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as StepListProps
  const { title, steps, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  const beatOffset = title ? 1 : 0

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 80px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 36,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 500, width: "100%" }}>
        {steps.map((step, i) => {
          const stepDelay =
            beatStartFrames?.[i + beatOffset] ?? motionStartFrame + Math.ceil(fps * 0.3) + i * Math.ceil(fps * 0.4)
          const stepSpring = spring({
            frame: Math.max(0, frame - stepDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.5),
          })
          const stepOpacity = interpolate(stepSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const stepScale = interpolate(stepSpring, [0, 1], [0.8, 1])

          const status = step.status ?? "completed"
          const isFilled = status === "completed"
          const isCurrent = status === "current"

          // Pulse for current step
          const pulseSpring = spring({
            frame: Math.max(0, frame - stepDelay - Math.ceil(fps * 0.3)),
            fps,
            config: { damping: 12, stiffness: 100 },
            durationInFrames: Math.ceil(fps * 2),
          })
          const pulseScale = isCurrent ? 1 + interpolate(pulseSpring, [0, 0.5, 1], [0, 0.12, 0]) : 1

          // Connector line
          const lineSpring = spring({
            frame: Math.max(0, frame - stepDelay - Math.ceil(fps * 0.2)),
            fps,
            config: { damping: 200 },
            durationInFrames: Math.ceil(fps * 0.3),
          })
          const lineScaleY = interpolate(lineSpring, [0, 1], [0, 1])

          return (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  opacity: stepOpacity,
                }}
              >
                {/* Number circle */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: isFilled ? tokens.primary : "transparent",
                    border: `2px solid ${isFilled || isCurrent ? tokens.primary : tokens.foregroundLow}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: isFilled ? tokens.primaryForeground : isCurrent ? tokens.primary : tokens.foregroundLow,
                    fontFamily: tokens.fontFamily,
                    flexShrink: 0,
                    transform: `scale(${stepScale * pulseScale})`,
                    boxShadow: isCurrent ? `0 0 12px ${tokens.primary}50` : "none",
                  }}
                >
                  {i + 1}
                </div>

                {/* Text */}
                <div style={{ paddingTop: 4 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: tokens.foreground,
                      fontFamily: tokens.fontFamily,
                    }}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div
                      style={{
                        fontSize: 14,
                        color: tokens.foregroundMid,
                        fontFamily: tokens.fontFamily,
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {step.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: 2,
                    height: 20,
                    background: tokens.foregroundLow,
                    marginLeft: 17,
                    transformOrigin: "top",
                    transform: `scaleY(${lineScaleY})`,
                    opacity: stepOpacity * 0.5,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in customSceneRegistry.ts**

Add import:

```ts
import { StepListScene } from "./scenes/custom/StepListScene"
```

Add to registry:

```ts
"step-list": StepListScene,
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/StepListScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): add step-list scene component"
```

---

### Task 18: Final registry verification and CHANGELOG

**Files:**

- Verify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Verify the final registry has all 26 entries**

The final `customSceneRegistry.ts` should have these 26 entries (10 original - 1 removed + 17 new):

```ts
export const customSceneRegistry: Record<string, FC<Record<string, unknown>>> = {
  // Original (9 remaining)
  "big-number": BigNumberScene,
  "block-diagram": BlockDiagramScene,
  "bullet-slide": BulletSlideScene,
  "code-block": CodeBlockScene,
  "comparison-table": ComparisonTableScene,
  "file-explorer": FileExplorerScene,
  "flow-diagram": FlowDiagramScene,
  "icon-grid": IconGridScene,
  "split-screen": SplitScreenScene,
  // Category 1: Narrative
  "before-after": BeforeAfterScene,
  "problem-solution": ProblemSolutionScene,
  timeline: TimelineScene,
  quote: QuoteScene,
  "chapter-card": ChapterCardScene,
  // Category 2: Data
  "stat-reveal": StatRevealScene,
  "progress-bars": ProgressBarsScene,
  "bar-chart": BarChartScene,
  countdown: CountdownScene,
  // Category 3: Demo
  "browser-mockup": BrowserMockupScene,
  "api-request": ApiRequestScene,
  "code-diff": CodeDiffScene,
  "annotated-image": AnnotatedImageScene,
  // Category 4: Presentation
  "media-card": MediaCardScene,
  "logo-wall": LogoWallScene,
  "two-column-text": TwoColumnTextScene,
  "step-list": StepListScene,
}
```

Run: `npm run lint`
Expected: PASS

- [ ] **Step 2: Update CHANGELOG.md**

Add under `[Unreleased]`:

```markdown
### Added

- 17 new custom scene components organized in 4 categories:
  - **Narrative/Transition:** before-after, problem-solution, timeline, quote, chapter-card
  - **Data/Impact:** stat-reveal, progress-bars, bar-chart, countdown
  - **Demo/Technical:** browser-mockup, api-request, code-diff, annotated-image
  - **Presentation:** media-card, logo-wall, two-column-text, step-list

### Removed

- `section-title` custom scene (replaced by `chapter-card` with richer props: description, subtitle)
```

- [ ] **Step 3: Update any tutorial configs that reference section-title**

Run: `grep -r "section-title" tutorials/ --include="*.json" -l`

For each config found, replace `"componentId": "section-title"` with `"componentId": "chapter-card"`. The props are a superset — existing `title`, `subtitle`, and `number` all carry over.

- [ ] **Step 4: Visual verification in Remotion Studio**

Run: `npm run dev`

Create a temporary test config or use an existing tutorial. Add a scene for each new type and verify:

1. Each scene renders without errors
2. Animations play as expected (springs, stagger, typewriter)
3. Theme tokens apply correctly (test with both `default` and `linea-directa` themes)
4. MascotWatermark appears in `linea-directa` theme and is hidden in `default`

- [ ] **Step 5: Commit CHANGELOG and config updates**

```bash
git add CHANGELOG.md
git add tutorials/  # if any configs were updated
git commit -m "docs: update CHANGELOG for scene catalog expansion"
```
