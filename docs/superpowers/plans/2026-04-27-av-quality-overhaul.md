# AV Quality Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand ProductShort from 4 to 12 scene types, enforce 60s+ duration, make voiceover complement (not repeat) visuals, and enable per-scene transitions.

**Architecture:** New scene components are vertical (1080x1920) adaptations of existing tutorial custom scenes, registered as first-class types in the ProductShort schema union. CompositionShell already uses `@remotion/transitions` — we extend it from global to per-scene transition config. The copywriter/director/audio_planner prompts are rewritten to enforce duration, narrative structure, and show-vs-tell voiceover.

**Tech Stack:** React, Remotion, Zod, @remotion/transitions (already installed), Python (agent prompts)

---

## File Structure

### New files

- `src/compositions/ProductShort/scenes/QuoteScene.tsx` — Testimonial/authority claim
- `src/compositions/ProductShort/scenes/StatRevealScene.tsx` — Impact number with counter
- `src/compositions/ProductShort/scenes/ComparisonTableScene.tsx` — Us vs competition
- `src/compositions/ProductShort/scenes/ProblemSolutionScene.tsx` — Tension + resolution
- `src/compositions/ProductShort/scenes/TimelineScene.tsx` — Process steps
- `src/compositions/ProductShort/scenes/BulletSlideScene.tsx` — Feature list with icons
- `src/compositions/ProductShort/scenes/ScreenshotScene.tsx` — Device-framed image with annotations
- `src/compositions/ProductShort/scenes/SplitStatScene.tsx` — Before/after number comparison

### Modified files

- `src/compositions/ProductShort/schema.ts` — Add 8 scene schemas + visualText/narrativeIntent
- `src/compositions/ProductShort/ProductShort.tsx` — Register 8 new scene renderers
- `src/shared/CompositionShell.tsx` — Per-scene transition type
- `src/shared/schemas/index.ts` — Export per-scene transition schema
- `packages/agent/prompts/copywriter.md` — Full rewrite
- `packages/agent/prompts/director.md` — Add intensity/transition rules
- `packages/agent/prompts/audio_planner.md` — Show vs tell protocol

---

## Task 0: Commit pending changes

**Files:**

- All currently modified files (CHANGELOG.md, render.py, test_tools.py, schema.ts, scene components, prompts)

- [ ] **Step 1: Stage and commit the audio fix**

```bash
git add packages/agent/src/tools/render.py packages/agent/tests/test_tools.py
git commit -m "fix(agent): pass voiceover and soundDesign to render service"
```

- [ ] **Step 2: Commit icon cleanup**

```bash
git add src/compositions/ProductShort/schema.ts \
  src/compositions/ProductShort/scenes/BenefitsScene.tsx \
  src/compositions/ClaudeCodeTutorial/scenes/custom/ProblemSolutionScene.tsx \
  src/compositions/ClaudeCodeTutorial/scenes/custom/IconGridScene.tsx \
  src/compositions/ClaudeCodeTutorial/scenes/custom/BulletSlideScene.tsx \
  packages/agent/prompts/copywriter.md
git commit -m "fix(schema): remove icon strings, use SVG components"
```

- [ ] **Step 3: Commit scene animation improvements**

```bash
git add src/compositions/ProductShort/scenes/HeroScene.tsx \
  src/compositions/ProductShort/scenes/PricingScene.tsx
git commit -m "feat(scene): improve HeroScene and PricingScene animations"
```

- [ ] **Step 4: Commit prompt improvements and CHANGELOG**

```bash
git add packages/agent/prompts/director.md CHANGELOG.md \
  docs/superpowers/specs/2026-04-27-av-quality-overhaul-design.md
git commit -m "docs: add AV quality overhaul spec, improve director prompt"
```

---

## Task 1: Add schema infrastructure for new scenes

**Files:**

- Modify: `src/compositions/ProductShort/schema.ts`
- Modify: `src/shared/schemas/index.ts`

- [ ] **Step 1: Add per-scene transition type to shared schema**

In `src/shared/schemas/index.ts`, add a per-scene transition field schema after the existing `TransitionConfigSchema`:

```typescript
export const SceneTransitionTypeSchema = z.enum(["fade", "slide", "wipe", "none"]).optional()
```

- [ ] **Step 2: Add visualText/narrativeIntent to DirectionSceneFieldsSchema**

In `src/shared/schemas/direction.ts`, add two optional string fields to `DirectionSceneFieldsSchema`:

```typescript
export const DirectionSceneFieldsSchema = z.object({
  timing: TimingSchema.optional(),
  beats: z.array(BeatSchema).optional(),
  visualText: z.string().optional(),
  narrativeIntent: z.string().optional(),
  transitionIn: z.enum(["fade", "slide", "wipe", "none"]).optional(),
})
```

- [ ] **Step 3: Add 8 new scene schemas to ProductShort**

In `src/compositions/ProductShort/schema.ts`, add after the existing scene schemas (before `ProductShortSceneSchema`):

```typescript
const QuoteSceneSchema = z
  .object({
    type: z.literal("quote"),
    text: z.string(),
    author: z.string().optional(),
    role: z.string().optional(),
    avatarUrl: z.string().optional(),
    accentColor: z.string().optional(),
    durationInSeconds: z.number().min(3).max(12),
  })
  .merge(DirectionSceneFieldsSchema)

const StatRevealSceneSchema = z
  .object({
    type: z.literal("stat-reveal"),
    value: z.number(),
    suffix: z.string().optional(),
    prefix: z.string().optional(),
    label: z.string().optional(),
    sublabel: z.string().optional(),
    showBar: z.boolean().optional(),
    barPercent: z.number().min(0).max(100).optional(),
    durationInSeconds: z.number().min(3).max(12),
  })
  .merge(DirectionSceneFieldsSchema)

const ComparisonCellSchema = z.union([
  z.string(),
  z.object({ text: z.string(), type: z.enum(["check", "cross", "text"]) }),
])

const ComparisonTableSceneSchema = z
  .object({
    type: z.literal("comparison-table"),
    title: z.string().optional(),
    headers: z.array(z.string()).min(2).max(3),
    rows: z.array(z.object({ cells: z.array(ComparisonCellSchema) })).min(1),
    highlightRow: z.number().int().min(0).optional(),
    durationInSeconds: z.number().min(4).max(15),
  })
  .merge(DirectionSceneFieldsSchema)

const ProblemSolutionSceneSchema = z
  .object({
    type: z.literal("problem-solution"),
    title: z.string().optional(),
    problem: z.object({ text: z.string() }),
    solution: z.object({ text: z.string() }),
    durationInSeconds: z.number().min(5).max(15),
  })
  .merge(DirectionSceneFieldsSchema)

const TimelineItemSchema = z.object({
  date: z.string(),
  text: z.string(),
  status: z.enum(["past", "current", "future"]).optional(),
})

const TimelineSceneSchema = z
  .object({
    type: z.literal("timeline"),
    title: z.string().optional(),
    items: z.array(TimelineItemSchema).min(2).max(6),
    durationInSeconds: z.number().min(5).max(15),
  })
  .merge(DirectionSceneFieldsSchema)

const BulletIconSchema = z.enum([
  "terminal",
  "cloud",
  "code",
  "folder",
  "shield",
  "gear",
  "user",
  "book",
  "lightbulb",
  "layers",
  "link",
  "check",
  "file",
  "arrow",
])

const BulletSlideSceneSchema = z
  .object({
    type: z.literal("bullet-slide"),
    title: z.string(),
    subtitle: z.string().optional(),
    items: z.array(z.object({ icon: BulletIconSchema.optional(), text: z.string() })).min(1),
    durationInSeconds: z.number().min(4).max(15),
  })
  .merge(DirectionSceneFieldsSchema)

const AnnotationSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  text: z.string(),
  position: z.enum(["top", "bottom", "left", "right"]).optional(),
})

const ScreenshotSceneSchema = z
  .object({
    type: z.literal("screenshot"),
    title: z.string().optional(),
    imageSrc: z.string(),
    device: z.enum(["phone", "desktop"]),
    annotations: z.array(AnnotationSchema).optional(),
    durationInSeconds: z.number().min(5).max(15),
  })
  .merge(DirectionSceneFieldsSchema)

const StatSideSchema = z.object({
  value: z.string(),
  suffix: z.string().optional(),
  prefix: z.string().optional(),
  label: z.string(),
})

const SplitStatSceneSchema = z
  .object({
    type: z.literal("split-stat"),
    title: z.string().optional(),
    left: StatSideSchema,
    right: StatSideSchema,
    highlight: z.enum(["left", "right"]),
    durationInSeconds: z.number().min(4).max(12),
  })
  .merge(DirectionSceneFieldsSchema)
```

- [ ] **Step 4: Update the union and export types**

Replace the `ProductShortSceneSchema` union and add type exports:

```typescript
const ProductShortSceneSchema = z.union([
  HeroSceneSchema,
  BenefitsSceneSchema,
  PricingSceneSchema,
  CtaSceneSchema,
  QuoteSceneSchema,
  StatRevealSceneSchema,
  ComparisonTableSceneSchema,
  ProblemSolutionSceneSchema,
  TimelineSceneSchema,
  BulletSlideSceneSchema,
  ScreenshotSceneSchema,
  SplitStatSceneSchema,
])
```

Add at the bottom with existing type exports:

```typescript
export type QuoteSceneProps = z.infer<typeof QuoteSceneSchema>
export type StatRevealSceneProps = z.infer<typeof StatRevealSceneSchema>
export type ComparisonTableSceneProps = z.infer<typeof ComparisonTableSceneSchema>
export type ProblemSolutionSceneProps = z.infer<typeof ProblemSolutionSceneSchema>
export type TimelineSceneProps = z.infer<typeof TimelineSceneSchema>
export type BulletSlideSceneProps = z.infer<typeof BulletSlideSceneSchema>
export type ScreenshotSceneProps = z.infer<typeof ScreenshotSceneSchema>
export type SplitStatSceneProps = z.infer<typeof SplitStatSceneSchema>
```

- [ ] **Step 5: Run lint to verify**

Run: `npm run lint`
Expected: 0 errors (warnings OK)

- [ ] **Step 6: Commit**

```bash
git add src/compositions/ProductShort/schema.ts src/shared/schemas/direction.ts src/shared/schemas/index.ts
git commit -m "feat(schema): add 8 new ProductShort scene types and per-scene fields"
```

---

## Task 2: Create QuoteScene and StatRevealScene (ProductShort)

**Files:**

- Create: `src/compositions/ProductShort/scenes/QuoteScene.tsx`
- Create: `src/compositions/ProductShort/scenes/StatRevealScene.tsx`

- [ ] **Step 1: Create QuoteScene**

```tsx
import React from "react"
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { QuoteSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

export const QuoteScene: React.FC<QuoteSceneProps> = ({ text, author, role, avatarUrl, accentColor, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStart = msToFrames(getSceneMotionDelayMs(timing), fps)
  const accent = accentColor ?? tokens.primary

  const markSpring = spring({
    frame: Math.max(0, frame - motionStart),
    fps,
    config: { damping: 200 },
    durationInFrames: 15,
  })
  const textSpring = spring({
    frame: Math.max(0, frame - motionStart - 6),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: 20,
  })
  const textScale = interpolate(textSpring, [0, 1], [0.97, 1])
  const lineSpring = spring({
    frame: Math.max(0, frame - motionStart - 14),
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  })
  const lineWidth = interpolate(lineSpring, [0, 1], [0, 80])
  const attrSpring = spring({
    frame: Math.max(0, frame - motionStart - 20),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: 20,
  })
  const attrY = interpolate(attrSpring, [0, 1], [15, 0])

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 60px",
      }}
    >
      <div
        style={{
          fontSize: 140,
          fontFamily: "Georgia, serif",
          color: `${accent}40`,
          opacity: markSpring,
          lineHeight: 1,
        }}
      >
        {"“"}
      </div>
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 36,
          fontStyle: "italic",
          color: tokens.foreground,
          textAlign: "center",
          lineHeight: 1.5,
          maxWidth: 900,
          opacity: textSpring,
          transform: `scale(${textScale})`,
          marginTop: -20,
        }}
      >
        {text}
      </div>
      <div
        style={{ width: lineWidth, height: 3, background: accent, borderRadius: 2, marginTop: 32, marginBottom: 32 }}
      />
      {author && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: attrSpring,
            transform: `translateY(${attrY}px)`,
          }}
        >
          {avatarUrl && (
            <Img src={avatarUrl} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
          )}
          <div>
            <div style={{ fontFamily: tokens.fontFamily, fontSize: 20, fontWeight: 700, color: tokens.foreground }}>
              {author}
            </div>
            {role && (
              <div style={{ fontFamily: tokens.fontFamily, fontSize: 16, color: tokens.foregroundMid }}>{role}</div>
            )}
          </div>
        </div>
      )}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Create StatRevealScene**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { StatRevealSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

export const StatRevealScene: React.FC<StatRevealSceneProps> = ({
  value,
  suffix,
  prefix,
  label,
  sublabel,
  showBar,
  barPercent,
  timing,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStart = msToFrames(getSceneMotionDelayMs(timing), fps)

  const labelSpring = spring({
    frame: Math.max(0, frame - motionStart),
    fps,
    config: { damping: 200 },
    durationInFrames: 15,
  })
  const counterDuration = Math.ceil(fps * 0.8)
  const counterStart = motionStart + 6
  const counterProgress = Math.min(1, Math.max(0, (frame - counterStart) / counterDuration))
  const displayValue = Math.round(counterProgress * value)
  const counterSpring = spring({
    frame: Math.max(0, frame - counterStart),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: 20,
  })
  const counterY = interpolate(counterSpring, [0, 1], [30, 0])
  const affixDelay = counterStart + Math.ceil(counterDuration * 0.6)
  const affixSpring = spring({
    frame: Math.max(0, frame - affixDelay),
    fps,
    config: { damping: 12, stiffness: 120 },
    durationInFrames: 15,
  })
  const affixScale = interpolate(affixSpring, [0, 1], [0.5, 1])
  const sublabelSpring = spring({
    frame: Math.max(0, frame - counterStart - counterDuration),
    fps,
    config: { damping: 200 },
    durationInFrames: 15,
  })
  const barSpring = spring({
    frame: Math.max(0, frame - counterStart - counterDuration - 6),
    fps,
    config: { damping: 200 },
    durationInFrames: 25,
  })
  const barWidth = interpolate(barSpring, [0, 1], [0, barPercent ?? 0])

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 60px",
        gap: 8,
      }}
    >
      {label && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 20,
            color: tokens.foregroundMid,
            opacity: labelSpring,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          opacity: counterSpring,
          transform: `translateY(${counterY}px)`,
        }}
      >
        {prefix && (
          <span
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 56,
              color: tokens.primary,
              opacity: affixSpring,
              transform: `scale(${affixScale})`,
              display: "inline-block",
            }}
          >
            {prefix}
          </span>
        )}
        <span style={{ fontFamily: tokens.fontFamily, fontSize: 120, fontWeight: 900, color: tokens.primary }}>
          {displayValue}
        </span>
        {suffix && (
          <span
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 56,
              color: tokens.primary,
              opacity: affixSpring,
              transform: `scale(${affixScale})`,
              display: "inline-block",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {sublabel && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 22,
            color: tokens.foregroundMid,
            opacity: sublabelSpring,
            marginTop: 8,
          }}
        >
          {sublabel}
        </div>
      )}
      {showBar && barPercent !== undefined && (
        <div
          style={{
            width: 300,
            height: 8,
            background: `${tokens.foregroundLow}40`,
            borderRadius: 4,
            marginTop: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${barWidth}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${tokens.primary}, ${tokens.secondary})`,
              borderRadius: 4,
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ProductShort/scenes/QuoteScene.tsx \
  src/compositions/ProductShort/scenes/StatRevealScene.tsx
git commit -m "feat(scene): add QuoteScene and StatRevealScene for ProductShort"
```

---

## Task 3: Create ComparisonTableScene and ProblemSolutionScene (ProductShort)

**Files:**

- Create: `src/compositions/ProductShort/scenes/ComparisonTableScene.tsx`
- Create: `src/compositions/ProductShort/scenes/ProblemSolutionScene.tsx`

- [ ] **Step 1: Create ComparisonTableScene**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { ComparisonTableSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { useSlideIn } from "../../../shared/hooks/useSlideIn"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

const CheckSvg: React.FC<{ color: string }> = ({ color }) => (
  <svg width={22} height={22} viewBox="0 0 16 16" fill="none">
    <path d="M3.5 8.5l3 3 6-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CrossSvg: React.FC<{ color: string }> = ({ color }) => (
  <svg width={22} height={22} viewBox="0 0 16 16" fill="none">
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ComparisonTableScene: React.FC<ComparisonTableSceneProps> = ({
  title,
  headers,
  rows,
  highlightRow,
  timing,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStart = msToFrames(getSceneMotionDelayMs(timing), fps)
  const titleAnim = useSlideIn({ delay: motionStart })

  const headerSpring = spring({
    frame: Math.max(0, frame - motionStart - 8),
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  })
  const colWidth = Math.floor(960 / headers.length)

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 40px",
        gap: 24,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: titleAnim.opacity,
            transform: `translateY(${titleAnim.y}px)`,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          background: tokens.card.bg,
          borderRadius: 12,
          border: `1px solid ${tokens.card.border}`,
          overflow: "hidden",
          opacity: headerSpring,
          width: "100%",
          maxWidth: 960,
        }}
      >
        <div style={{ display: "flex", borderBottom: `2px solid ${tokens.primary}` }}>
          {headers.map((h, ci) => (
            <div
              key={ci}
              style={{
                width: ci === 0 ? colWidth * 1.4 : colWidth,
                padding: "16px 20px",
                fontFamily: tokens.fontFamily,
                fontSize: 18,
                fontWeight: 700,
                color: tokens.foreground,
              }}
            >
              {h}
            </div>
          ))}
        </div>
        {rows.map((row, ri) => {
          const rowSpring = spring({
            frame: Math.max(0, frame - motionStart - 14 - ri * 6),
            fps,
            config: { damping: 200 },
            durationInFrames: 18,
          })
          const isHighlight = highlightRow === ri
          return (
            <div
              key={ri}
              style={{
                display: "flex",
                borderBottom: `1px solid ${tokens.card.border}`,
                opacity: rowSpring,
                background: isHighlight ? `${tokens.primary}15` : "transparent",
              }}
            >
              {row.cells.map((cell, ci) => {
                const cellVal = typeof cell === "string" ? { text: cell, type: "text" as const } : cell
                return (
                  <div
                    key={ci}
                    style={{
                      width: ci === 0 ? colWidth * 1.4 : colWidth,
                      padding: "14px 20px",
                      fontFamily: tokens.fontFamily,
                      fontSize: 16,
                      color: tokens.foreground,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {cellVal.type === "check" ? (
                      <CheckSvg color={tokens.terminal.successColor} />
                    ) : cellVal.type === "cross" ? (
                      <CrossSvg color="#ff5f57" />
                    ) : (
                      cellVal.text
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Create ProblemSolutionScene**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { ProblemSolutionSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

const CrossSvg: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CheckSvg: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3.5 8.5l3 3 6-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ProblemSolutionScene: React.FC<ProblemSolutionSceneProps> = ({ title, problem, solution, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStart = msToFrames(getSceneMotionDelayMs(timing), fps)

  const problemColor = tokens.terminal.labelColor
  const solutionColor = tokens.terminal.successColor

  const titleSpring = spring({
    frame: Math.max(0, frame - motionStart),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: 15,
  })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  const problemSpring = spring({
    frame: Math.max(0, frame - motionStart - 10),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: 15,
  })
  const problemX = interpolate(problemSpring, [0, 1], [-30, 0])

  const lineSpring = spring({
    frame: Math.max(0, frame - motionStart - 20),
    fps,
    config: { damping: 200 },
    durationInFrames: 15,
  })
  const lineHeight = interpolate(lineSpring, [0, 1], [0, 80])

  const solutionSpring = spring({
    frame: Math.max(0, frame - motionStart - 28),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: 15,
  })
  const solutionX = interpolate(solutionSpring, [0, 1], [-30, 0])

  const blockStyle = (accent: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 20,
    background: tokens.card.bg,
    border: `1px solid ${tokens.card.border}`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 12,
    padding: "24px 32px",
    boxShadow: tokens.card.shadow,
    width: "100%",
    maxWidth: 900,
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 60px",
        gap: 0,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            marginBottom: 48,
            opacity: interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          ...blockStyle(problemColor),
          opacity: interpolate(problemSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateX(${problemX}px)`,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: `${problemColor}20`,
            border: `2px solid ${problemColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CrossSvg size={24} color={problemColor} />
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: problemColor,
              marginBottom: 6,
            }}
          >
            Problema
          </div>
          <div style={{ fontSize: 22, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.4 }}>
            {problem.text}
          </div>
        </div>
      </div>

      <div style={{ width: 3, height: lineHeight, background: `linear-gradient(${problemColor}, ${solutionColor})` }} />

      <div
        style={{
          ...blockStyle(solutionColor),
          opacity: interpolate(solutionSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateX(${solutionX}px)`,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: `${solutionColor}20`,
            border: `2px solid ${solutionColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CheckSvg size={24} color={solutionColor} />
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: solutionColor,
              marginBottom: 6,
            }}
          >
            Solucion
          </div>
          <div style={{ fontSize: 22, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.4 }}>
            {solution.text}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ProductShort/scenes/ComparisonTableScene.tsx \
  src/compositions/ProductShort/scenes/ProblemSolutionScene.tsx
git commit -m "feat(scene): add ComparisonTableScene and ProblemSolutionScene for ProductShort"
```

---

## Task 4: Create TimelineScene and BulletSlideScene (ProductShort)

**Files:**

- Create: `src/compositions/ProductShort/scenes/TimelineScene.tsx`
- Create: `src/compositions/ProductShort/scenes/BulletSlideScene.tsx`

- [ ] **Step 1: Create TimelineScene**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { TimelineSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { useSlideIn } from "../../../shared/hooks/useSlideIn"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

export const TimelineScene: React.FC<TimelineSceneProps> = ({ title, items, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStart = msToFrames(getSceneMotionDelayMs(timing), fps)
  const titleAnim = useSlideIn({ delay: motionStart })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "80px 60px",
        gap: 32,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: titleAnim.opacity,
            transform: `translateY(${titleAnim.y}px)`,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%", maxWidth: 800, paddingLeft: 40 }}>
        {items.map((item, idx) => {
          const itemSpring = spring({
            frame: Math.max(0, frame - motionStart - 8 - idx * 10),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: 18,
          })
          const itemScale = interpolate(itemSpring, [0, 1], [0.8, 1])
          const isCurrent = item.status === "current"
          const isFuture = item.status === "future"
          const filled = !isFuture
          const pulse = isCurrent ? interpolate(Math.sin(frame * 0.15), [-1, 1], [0, 0.15]) : 0

          const connectorSpring =
            idx < items.length - 1
              ? spring({
                  frame: Math.max(0, frame - motionStart - 14 - idx * 10),
                  fps,
                  config: { damping: 200 },
                  durationInFrames: 15,
                })
              : 0

          return (
            <React.Fragment key={idx}>
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  alignItems: "flex-start",
                  opacity: itemSpring,
                  transform: `scale(${itemScale})`,
                  transformOrigin: "left center",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    flexShrink: 0,
                    marginTop: 4,
                    background: filled ? tokens.primary : "transparent",
                    border: `2px solid ${filled ? tokens.primary : tokens.foregroundLow}`,
                    boxShadow: isCurrent ? `0 0 12px ${tokens.primary}60` : "none",
                    transform: `scale(${1 + pulse})`,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: tokens.fontFamily,
                      fontSize: 14,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: isFuture ? tokens.foregroundLow : tokens.foregroundMid,
                      marginBottom: 4,
                    }}
                  >
                    {item.date}
                  </div>
                  <div
                    style={{
                      fontFamily: tokens.fontFamily,
                      fontSize: 20,
                      color: isFuture ? tokens.foregroundLow : tokens.foreground,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.text}
                  </div>
                </div>
              </div>
              {idx < items.length - 1 && (
                <div
                  style={{
                    width: 2,
                    height: 36,
                    background: tokens.primary,
                    marginLeft: 9,
                    opacity: 0.4,
                    transform: `scaleY(${connectorSpring})`,
                    transformOrigin: "top",
                  }}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Create BulletSlideScene**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { BulletSlideSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { useSlideIn } from "../../../shared/hooks/useSlideIn"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"
import {
  TerminalIcon,
  CloudIcon,
  CodeIcon,
  FolderIcon,
  ShieldIcon,
  GearIcon,
  UserIcon,
  BookIcon,
  LightbulbIcon,
  LayersIcon,
  LinkIcon,
  CheckIcon,
  FileIcon,
  ArrowRightIcon,
} from "../../ClaudeCodeTutorial/scenes/custom/svg-icons"

const iconLookup: Record<string, React.FC<{ size?: number; color?: string }>> = {
  terminal: TerminalIcon,
  cloud: CloudIcon,
  code: CodeIcon,
  folder: FolderIcon,
  shield: ShieldIcon,
  gear: GearIcon,
  user: UserIcon,
  book: BookIcon,
  lightbulb: LightbulbIcon,
  layers: LayersIcon,
  link: LinkIcon,
  check: CheckIcon,
  file: FileIcon,
  arrow: ArrowRightIcon,
}

export const BulletSlideScene: React.FC<BulletSlideSceneProps> = ({ title, subtitle, items, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStart = msToFrames(getSceneMotionDelayMs(timing), fps)
  const titleAnim = useSlideIn({ delay: motionStart })

  const accentSpring = spring({
    frame: Math.max(0, frame - motionStart - 4),
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  })
  const accentWidth = interpolate(accentSpring, [0, 1], [0, 80])

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        padding: "100px 60px",
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 44,
          fontWeight: 700,
          color: tokens.primary,
          opacity: titleAnim.opacity,
          transform: `translateY(${titleAnim.y}px)`,
        }}
      >
        {title}
      </div>
      <div style={{ width: accentWidth, height: 3, background: tokens.primary, borderRadius: 2, marginBottom: 8 }} />
      {subtitle && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 24,
            color: tokens.foregroundMid,
            opacity: accentSpring,
            marginBottom: 16,
          }}
        >
          {subtitle}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((item, idx) => {
          const itemSpring = spring({
            frame: Math.max(0, frame - motionStart - 12 - idx * 6),
            fps,
            config: { damping: 200 },
            durationInFrames: 18,
          })
          const itemX = interpolate(itemSpring, [0, 1], [-20, 0])
          const IconComponent = item.icon ? iconLookup[item.icon] : null

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                opacity: itemSpring,
                transform: `translateX(${itemX}px)`,
              }}
            >
              {IconComponent ? (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `${tokens.primary}10`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={24} color={tokens.primary} />
                </div>
              ) : (
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: tokens.primary,
                    flexShrink: 0,
                    marginLeft: 17,
                    marginRight: 17,
                  }}
                />
              )}
              <div style={{ fontFamily: tokens.fontFamily, fontSize: 28, color: tokens.foreground, lineHeight: 1.4 }}>
                {item.text}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ProductShort/scenes/TimelineScene.tsx \
  src/compositions/ProductShort/scenes/BulletSlideScene.tsx
git commit -m "feat(scene): add TimelineScene and BulletSlideScene for ProductShort"
```

---

## Task 5: Create ScreenshotScene and SplitStatScene (new scenes)

**Files:**

- Create: `src/compositions/ProductShort/scenes/ScreenshotScene.tsx`
- Create: `src/compositions/ProductShort/scenes/SplitStatScene.tsx`

- [ ] **Step 1: Create ScreenshotScene**

```tsx
import React from "react"
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { ScreenshotSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { useSlideIn } from "../../../shared/hooks/useSlideIn"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

export const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({ title, imageSrc, device, annotations, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStart = msToFrames(getSceneMotionDelayMs(timing), fps)
  const titleAnim = useSlideIn({ delay: motionStart })

  const deviceSpring = spring({
    frame: Math.max(0, frame - motionStart - 6),
    fps,
    config: { damping: 16, stiffness: 150 },
    durationInFrames: 25,
  })
  const deviceScale = interpolate(deviceSpring, [0, 1], [0.85, 1])

  const isPhone = device === "phone"
  const deviceWidth = isPhone ? 380 : 860
  const deviceHeight = isPhone ? 760 : 540
  const borderRadius = isPhone ? 40 : 12

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 40px",
        gap: 28,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: titleAnim.opacity,
            transform: `translateY(${titleAnim.y}px)`,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}
      <div style={{ position: "relative", opacity: deviceSpring, transform: `scale(${deviceScale})` }}>
        <div
          style={{
            width: deviceWidth,
            height: deviceHeight,
            borderRadius,
            border: `${isPhone ? 8 : 4}px solid ${tokens.foregroundLow}40`,
            overflow: "hidden",
            background: tokens.card.bg,
            boxShadow: `0 20px 60px ${tokens.foregroundLow}30`,
          }}
        >
          {isPhone && (
            <div
              style={{
                height: 32,
                background: tokens.foregroundLow + "20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 80, height: 6, borderRadius: 3, background: tokens.foregroundLow + "40" }} />
            </div>
          )}
          {!isPhone && (
            <div
              style={{
                height: 36,
                background: tokens.foregroundLow + "15",
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                gap: 8,
              }}
            >
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
              ))}
            </div>
          )}
          <Img
            src={imageSrc}
            style={{ width: "100%", height: isPhone ? deviceHeight - 32 : deviceHeight - 36, objectFit: "cover" }}
          />
        </div>

        {annotations?.map((ann, idx) => {
          const annSpring = spring({
            frame: Math.max(0, frame - motionStart - 18 - idx * 8),
            fps,
            config: { damping: 16, stiffness: 140 },
            durationInFrames: 18,
          })
          const annScale = interpolate(annSpring, [0, 1], [0, 1])
          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: `${ann.x}%`,
                top: `${ann.y}%`,
                transform: `translate(-50%, -50%) scale(${annScale})`,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: tokens.primary,
                  color: tokens.primaryForeground,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: `0 2px 8px ${tokens.primary}60`,
                }}
              >
                {idx + 1}
              </div>
              {ann.text && (
                <div
                  style={{
                    position: "absolute",
                    [ann.position === "left"
                      ? "right"
                      : ann.position === "top"
                        ? "bottom"
                        : ann.position === "bottom"
                          ? "top"
                          : "left"]: 36,
                    top: ann.position === "left" || ann.position === "right" ? "50%" : undefined,
                    left: ann.position === "top" || ann.position === "bottom" ? "50%" : undefined,
                    transform:
                      ann.position === "left" || ann.position === "right" ? "translateY(-50%)" : "translateX(-50%)",
                    background: tokens.card.bg,
                    border: `1px solid ${tokens.card.border}`,
                    padding: "8px 14px",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                    fontFamily: tokens.fontFamily,
                    fontSize: 14,
                    color: tokens.foreground,
                    boxShadow: tokens.card.shadow,
                  }}
                >
                  {ann.text}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Create SplitStatScene**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { SplitStatSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { useSlideIn } from "../../../shared/hooks/useSlideIn"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

export const SplitStatScene: React.FC<SplitStatSceneProps> = ({ title, left, right, highlight, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStart = msToFrames(getSceneMotionDelayMs(timing), fps)
  const titleAnim = useSlideIn({ delay: motionStart })

  const counterDuration = Math.ceil(fps * 0.8)
  const counterStart = motionStart + 8

  const renderSide = (side: typeof left, isHighlighted: boolean, delay: number) => {
    const sideSpring = spring({
      frame: Math.max(0, frame - delay),
      fps,
      config: { damping: 16, stiffness: 150 },
      durationInFrames: 20,
    })
    const sideScale = isHighlighted
      ? interpolate(sideSpring, [0, 1], [0.8, 1])
      : interpolate(sideSpring, [0, 1], [0.9, 1])
    const progress = Math.min(1, Math.max(0, (frame - delay) / counterDuration))
    const numericValue = parseFloat(side.value.replace(/[^0-9.]/g, ""))
    const displayNum = isNaN(numericValue) ? side.value : Math.round(progress * numericValue).toString()

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          opacity: sideSpring,
          transform: `scale(${sideScale})`,
          flex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline" }}>
          {side.prefix && (
            <span
              style={{
                fontFamily: tokens.fontFamily,
                fontSize: 40,
                color: isHighlighted ? tokens.primary : tokens.foregroundMid,
              }}
            >
              {side.prefix}
            </span>
          )}
          <span
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 96,
              fontWeight: 900,
              color: isHighlighted ? tokens.primary : tokens.foreground,
            }}
          >
            {displayNum}
          </span>
          {side.suffix && (
            <span
              style={{
                fontFamily: tokens.fontFamily,
                fontSize: 40,
                color: isHighlighted ? tokens.primary : tokens.foregroundMid,
              }}
            >
              {side.suffix}
            </span>
          )}
        </div>
        <div style={{ fontFamily: tokens.fontFamily, fontSize: 20, color: tokens.foregroundMid, textAlign: "center" }}>
          {side.label}
        </div>
      </div>
    )
  }

  const vsSpring = spring({
    frame: Math.max(0, frame - counterStart - 4),
    fps,
    config: { damping: 200 },
    durationInFrames: 15,
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 40px",
        gap: 32,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: titleAnim.opacity,
            transform: `translateY(${titleAnim.y}px)`,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 24, width: "100%" }}>
        {renderSide(left, highlight === "left", counterStart)}
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 28,
            fontWeight: 700,
            color: tokens.foregroundLow,
            opacity: vsSpring,
          }}
        >
          VS
        </div>
        {renderSide(right, highlight === "right", counterStart + 4)}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ProductShort/scenes/ScreenshotScene.tsx \
  src/compositions/ProductShort/scenes/SplitStatScene.tsx
git commit -m "feat(scene): add ScreenshotScene and SplitStatScene for ProductShort"
```

---

## Task 6: Register new scenes in ProductShort composition and add per-scene transitions

**Files:**

- Modify: `src/compositions/ProductShort/ProductShort.tsx`
- Modify: `src/shared/CompositionShell.tsx`

- [ ] **Step 1: Register all 8 new scenes in ProductShort.tsx**

Replace the `renderScene` callback in `src/compositions/ProductShort/ProductShort.tsx`:

```tsx
import React from "react"
import { ProductShortConfig } from "./schema"
import { BenefitsScene } from "./scenes/BenefitsScene"
import { CtaScene } from "./scenes/CtaScene"
import { HeroScene } from "./scenes/HeroScene"
import { PricingScene } from "./scenes/PricingScene"
import { QuoteScene } from "./scenes/QuoteScene"
import { StatRevealScene } from "./scenes/StatRevealScene"
import { ComparisonTableScene } from "./scenes/ComparisonTableScene"
import { ProblemSolutionScene } from "./scenes/ProblemSolutionScene"
import { TimelineScene } from "./scenes/TimelineScene"
import { BulletSlideScene } from "./scenes/BulletSlideScene"
import { ScreenshotScene } from "./scenes/ScreenshotScene"
import { SplitStatScene } from "./scenes/SplitStatScene"
import { CompositionShell } from "../../shared/CompositionShell"

export const ProductShort: React.FC<ProductShortConfig> = (config) => {
  return (
    <CompositionShell
      config={config}
      theme="linea-directa"
      musicLoop
      renderScene={(scene) => (
        <>
          {scene.type === "hero" && <HeroScene {...scene} />}
          {scene.type === "benefits" && <BenefitsScene {...scene} />}
          {scene.type === "pricing" && <PricingScene {...scene} />}
          {scene.type === "cta" && <CtaScene {...scene} />}
          {scene.type === "quote" && <QuoteScene {...scene} />}
          {scene.type === "stat-reveal" && <StatRevealScene {...scene} />}
          {scene.type === "comparison-table" && <ComparisonTableScene {...scene} />}
          {scene.type === "problem-solution" && <ProblemSolutionScene {...scene} />}
          {scene.type === "timeline" && <TimelineScene {...scene} />}
          {scene.type === "bullet-slide" && <BulletSlideScene {...scene} />}
          {scene.type === "screenshot" && <ScreenshotScene {...scene} />}
          {scene.type === "split-stat" && <SplitStatScene {...scene} />}
        </>
      )}
    />
  )
}
```

- [ ] **Step 2: Add per-scene transition support in CompositionShell**

In `src/shared/CompositionShell.tsx`, modify the `CompositionShellScene` interface to include `transitionIn`:

```typescript
interface CompositionShellScene {
  type: string
  durationInSeconds: number
  timing?: Timing
  beats?: Beat[]
  componentId?: string
  transitionIn?: "fade" | "slide" | "wipe" | "none"
}
```

Then modify the `sceneInfos.flatMap` block (around line 91) to use per-scene transition when available, falling back to the global config:

Replace the transition selection logic inside `flatMap`:

```typescript
{sceneInfos.flatMap((info, i) => {
  const { directedScene, durationInFrames, timing, hasVoiceover, audioDelayFrames } = info
  const elements: React.ReactNode[] = []
  if (i > 0) {
    const sceneTransType = directedScene.transitionIn ?? transitionType
    let scenePresentation: TransitionPresentation<Record<string, unknown>> | null = null
    switch (sceneTransType) {
      case "fade": scenePresentation = fade() as TransitionPresentation<Record<string, unknown>>; break
      case "slide": scenePresentation = slide() as TransitionPresentation<Record<string, unknown>>; break
      case "wipe": scenePresentation = wipe() as TransitionPresentation<Record<string, unknown>>; break
    }
    if (scenePresentation) {
      elements.push(
        <TransitionSeries.Transition
          key={`t-${i}`}
          presentation={scenePresentation}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />,
      )
    }
  }
  elements.push(
    <TransitionSeries.Sequence key={i} durationInFrames={durationInFrames}>
      {/* ...rest of sequence content unchanged... */}
    </TransitionSeries.Sequence>,
  )
  return elements
})}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ProductShort/ProductShort.tsx \
  src/shared/CompositionShell.tsx
git commit -m "feat(composition): register 8 new scenes, add per-scene transitions"
```

---

## Task 7: Rewrite copywriter prompt

**Files:**

- Modify: `packages/agent/prompts/copywriter.md`

- [ ] **Step 1: Rewrite the copywriter prompt**

Replace the entire file content. Key changes from current version:

1. **Duration enforcement**: Add minimum duration section (60s ProductShort, 90s tutorials, min 6 scenes)
2. **Narrative structure**: Add 5-block template (Hook, Context, Solution, Proof, Close)
3. **12 ProductShort scenes**: Document all 12 scene types with JSON examples (the 4 existing + 8 new)
4. **visualText/narrativeIntent**: Add section explaining these internal fields — copywriter MUST populate them for every scene
5. **Scene selection guide**: Add table mapping narrative intent to recommended scene type
6. **Copy density**: hero max 8 words, benefit max 12, CTA max 5
7. **Flow rules**: Never repeat scene type consecutively, minimum 6 scenes

The prompt should preserve the existing workflow (query_scene_catalog, present_escaleta loop, return config) and the "What you DON'T do" section unchanged.

Remove the old `benefits` icon documentation (already done in previous session).

The full prompt is too long to include inline — the implementer should read the current file, keep the workflow/structure sections, and add the new content described above into the appropriate sections.

- [ ] **Step 2: Commit**

```bash
git add packages/agent/prompts/copywriter.md
git commit -m "docs(prompt): rewrite copywriter with duration, storytelling, 12 scene types"
```

---

## Task 8: Rewrite director and audio_planner prompts

**Files:**

- Modify: `packages/agent/prompts/director.md`
- Modify: `packages/agent/prompts/audio_planner.md`

- [ ] **Step 1: Enhance director prompt**

Add to `packages/agent/prompts/director.md`:

1. **Per-scene `transitionIn` field**: The director now adds `transitionIn` to each scene ("fade", "slide", "wipe", or "none")
2. **Transition rules**: Never 3x same transition in a row, `wipe` max 2 per video, first scene always "none" or "fade", CTA always "wipe" or "slide"
3. **Voiceover timing offsets**: Voice starts 300-500ms BEFORE visual (anticipation) or 200-400ms AFTER (reinforcement). Never exactly synchronized
4. **Silence markers**: Add `{ "silence": true }` beat for hero, pricing, stat-reveal (min 2s without voice)

The visual emphasis and scene-specific patterns from the previous session are already in the file — keep them.

- [ ] **Step 2: Rewrite audio_planner prompt**

Add to `packages/agent/prompts/audio_planner.md` after the workflow section:

```markdown
## Show vs Tell Protocol

You receive scenes with `visualText` (what appears on screen) and `narrativeIntent` (what the voice should communicate). Follow these rules:

1. **Never repeat `visualText`.** If screen says "24/7 cobertura", voice says "Porque un accidente no avisa"
2. **Voice contextualizes, screen synthesizes.** Visual = the data. Voice = why it matters
3. **Mandatory silence on impact scenes.** hero, pricing, stat-reveal: minimum 2 seconds without voice. Set the voiceover scene entry to `{ "text": "", "leadInMs": 2000 }` for these
4. **Timing offset.** Voice starts BEFORE visual appears (anticipates) or AFTER (reinforces). Never exactly synchronized with visual reveal
5. **Tone.** Conversational and empathetic. As if explaining to a friend. Not reading a feature list
6. **Text density.** Max 2 short sentences per scene. Max 15 words per sentence. Shorter is better
7. **Read both fields.** For each scene, read `visualText` to know what NOT to say, and `narrativeIntent` to know what TO communicate
```

- [ ] **Step 3: Commit**

```bash
git add packages/agent/prompts/director.md \
  packages/agent/prompts/audio_planner.md
git commit -m "docs(prompt): add show-vs-tell protocol, per-scene transitions to director/audio_planner"
```

---

## Task 9: Update CHANGELOG and verify

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update CHANGELOG**

Add entries under `[Unreleased]` for all changes in this plan:

```markdown
### Added

- 8 new ProductShort scene types: quote, stat-reveal, comparison-table, problem-solution, timeline, bullet-slide, screenshot, split-stat
- Per-scene transition type (`transitionIn` field) — director can assign fade/slide/wipe/none per scene
- `visualText` and `narrativeIntent` internal fields for voiceover coordination
- Show vs Tell voiceover protocol in audio_planner prompt

### Changed

- Copywriter prompt rewritten: 12 scene types documented, 60s minimum duration enforced, 5-block narrative structure, copy density rules
- Director prompt: transition rules, voiceover timing offsets, silence markers
- Audio planner prompt: show vs tell protocol, mandatory silence on impact scenes
```

- [ ] **Step 2: Run full verification**

Run: `npm run lint`
Expected: 0 errors

Run: `npm run dev`
Expected: Remotion Studio opens. Navigate to ProductShort composition and verify new scene types render without errors using a test config

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG with AV quality overhaul changes"
```
