# VHS + Remotion + Linea Directa Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add VHS screen recording support, Linea Directa brand theming, and a pixel art mascot to the Remotion tutorial pipeline.

**Architecture:** New `screenRecording` scene type embeds VHS-recorded `.mp4` files via Remotion's `<Video>`. A `ThemeContext` delivers brand theming (`"default"` or `"linea-directa"`) to all scene components. The render script copies video assets to `public/` before bundling and cleans up after.

**Tech Stack:** Remotion v4, React 19, Zod, TypeScript, VHS (external CLI)

**Spec:** `docs/superpowers/specs/2026-03-22-vhs-remotion-linea-directa-design.md`

---

### Task 1: Schema changes — add `theme` and `ScreenRecordingScene`

**Files:**
- Modify: `src/compositions/ClaudeCodeTutorial/schema.ts`

- [ ] **Step 1: Add `ScreenRecordingSceneSchema` after `CustomSceneSchema`**

```typescript
const ScreenRecordingSceneSchema = z.object({
  type: z.literal("screenRecording"),
  src: z.string(),
  trim: z
    .object({
      startSec: z.number().min(0),
      endSec: z.number().min(0),
    })
    .refine((t) => t.endSec > t.startSec, "endSec must be greater than startSec")
    .optional(),
  frame: z
    .object({
      background: z.string().default("#FFFFFF"),
      borderRadius: z.number().default(12),
      padding: z.number().default(40),
      shadow: z.boolean().default(true),
    })
    .optional(),
  resolvedSrc: z.string().optional(),
  durationInSeconds: z.number().min(1).max(120),
})
```

- [ ] **Step 2: Add `ScreenRecordingSceneSchema` to the `SceneSchema` union**

```typescript
const SceneSchema = z.union([
  IntroSceneSchema,
  TerminalSceneSchema,
  CalloutSceneSchema,
  OutroSceneSchema,
  CustomSceneSchema,
  ScreenRecordingSceneSchema,
])
```

- [ ] **Step 3: Add `theme` to `TutorialConfigSchema`**

Add after `height`:

```typescript
theme: z.enum(["default", "linea-directa"]).default("default"),
```

- [ ] **Step 4: Export the new type**

```typescript
export type ThemeName = TutorialConfig["theme"]
```

- [ ] **Step 5: Verify schema compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/schema.ts
git commit -m "feat: add screenRecording scene and theme to tutorial schema"
```

---

### Task 2: ThemeContext

**Files:**
- Create: `src/compositions/ClaudeCodeTutorial/ThemeContext.ts`

- [ ] **Step 1: Create ThemeContext file**

```typescript
import React from "react"
import type { ThemeName } from "./schema"

export const ThemeContext = React.createContext<ThemeName>("default")
export const useTheme = () => React.useContext(ThemeContext)
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/ThemeContext.ts
git commit -m "feat: add ThemeContext for brand theming"
```

---

### Task 3: PixelPhoneMascot component

**Files:**
- Create: `src/compositions/ClaudeCodeTutorial/components/PixelPhoneMascot.tsx`

The mascot is the Linea Directa logo: a red rotary telephone mounted on car wheels. Implemented as an inline SVG with pixel-art style (sharp edges, no anti-aliasing). Each "pixel" is a `<rect>` in a 32x24 grid, scaled by `props.scale`.

- [ ] **Step 1: Create the component file**

```tsx
import React from "react"
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion"

type Props = {
  scale?: number
  animate?: boolean
}

// 32x24 pixel grid — each number maps to a color
// 0=transparent, 1=#CC3333 (red body), 2=#1A1A1A (black), 3=#FF5555 (highlight), 4=#999999 (gray wheel)
const PIXEL_MAP: number[][] = [
  // Row 0-3: handset
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,0,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,0,0,0,0,0],
  [0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0],
  // Row 4-7: handset bar + top of body
  [0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,1,1,3,3,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,1,3,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
  // Row 8-11: body with dial
  [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,2,0,2,0,2,0,2,0,2,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  // Row 12-15: body bottom + dial bottom
  [0,0,0,0,0,0,1,1,1,1,2,0,2,0,2,0,2,0,2,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
  // Row 16-19: base
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
  // Row 20-23: wheels
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,0,0,0,0],
  [0,0,2,2,4,4,4,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,4,4,4,2,2,0,0,0],
  [0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,0,0,0,0],
]

const COLORS: Record<number, string> = {
  0: "transparent",
  1: "#CC3333",
  2: "#1A1A1A",
  3: "#FF5555",
  4: "#999999",
}

const PIXEL_SIZE = 4

export const PixelPhoneMascot: React.FC<Props> = ({ scale = 1, animate = true }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const bounceY = animate
    ? interpolate(
        spring({ frame, fps, config: { damping: 8, stiffness: 120 }, durationInFrames: Math.ceil(fps * 0.8) }),
        [0, 1],
        [20, 0]
      )
    : 0

  const totalWidth = 32 * PIXEL_SIZE * scale
  const totalHeight = 24 * PIXEL_SIZE * scale

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${32 * PIXEL_SIZE} ${24 * PIXEL_SIZE}`}
      style={{
        transform: `translateY(${bounceY}px)`,
        imageRendering: "pixelated",
      }}
    >
      {PIXEL_MAP.flatMap((row, y) =>
        row.map((colorIdx, x) => {
          if (colorIdx === 0) return null
          return (
            <rect
              key={`${x}-${y}`}
              x={x * PIXEL_SIZE}
              y={y * PIXEL_SIZE}
              width={PIXEL_SIZE}
              height={PIXEL_SIZE}
              fill={COLORS[colorIdx]}
            />
          )
        })
      )}
    </svg>
  )
}
```

NOTE: The pixel map above is an approximation. After rendering, visually verify and iterate on the grid to better match the Linea Directa phone logo. The key elements are: black handset on top, red body with circular dial (black dots in grid pattern), red base, and two black wheels with gray hubcaps at the bottom.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/components/PixelPhoneMascot.tsx
git commit -m "feat: add PixelPhoneMascot component for Linea Directa branding"
```

---

### Task 4: ScreenRecordingScene component

**Files:**
- Create: `src/compositions/ClaudeCodeTutorial/scenes/ScreenRecordingScene.tsx`

This component renders a VHS-recorded `.mp4` inside a styled frame. It uses `staticFile()` with the `resolvedSrc` path injected by `render.ts`.

- [ ] **Step 1: Create the component**

```tsx
import React from "react"
import {
  AbsoluteFill,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion"
import { z } from "zod"
import { TutorialConfigSchema } from "../schema"

type ScreenRecordingSceneProps = Extract<
  z.infer<typeof TutorialConfigSchema>["scenes"][number],
  { type: "screenRecording" }
> & { fps: number }

const FRAME_DEFAULTS = {
  background: "#FFFFFF",
  borderRadius: 12,
  padding: 40,
  shadow: true,
}

export const ScreenRecordingScene: React.FC<ScreenRecordingSceneProps> = ({
  src,
  trim,
  frame: frameConfig,
  resolvedSrc,
}) => {
  const currentFrame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const f = { ...FRAME_DEFAULTS, ...frameConfig }

  const enterSpring = spring({
    frame: currentFrame,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  })
  const opacity = interpolate(enterSpring, [0, 1], [0, 1])
  const translateY = interpolate(enterSpring, [0, 1], [20, 0])

  const videoSrc = resolvedSrc ? staticFile(resolvedSrc) : src
  const startFromFrame = trim ? Math.round(trim.startSec * fps) : 0
  const endAtFrame = trim ? Math.round(trim.endSec * fps) : undefined

  return (
    <AbsoluteFill
      style={{
        background: f.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: f.padding,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: f.borderRadius,
          overflow: "hidden",
          opacity,
          transform: `translateY(${translateY}px)`,
          boxShadow: f.shadow ? "0 20px 60px rgba(0,0,0,0.15)" : "none",
        }}
      >
        <Video
          src={videoSrc}
          startFrom={startFromFrame}
          endAt={endAtFrame}
          volume={0}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/ScreenRecordingScene.tsx
git commit -m "feat: add ScreenRecordingScene for embedded VHS recordings"
```

---

### Task 5: Update IntroScene with theme support

**Files:**
- Modify: `src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx`

- [ ] **Step 1: Add theme import and mascot**

Add imports at the top:

```typescript
import { useTheme } from "../ThemeContext"
import { PixelPhoneMascot } from "../components/PixelPhoneMascot"
```

- [ ] **Step 2: Use theme in the component**

Inside the component, after `const { fps } = useVideoConfig()`:

```typescript
const theme = useTheme()
const isLD = theme === "linea-directa"
```

- [ ] **Step 3: Update the JSX**

Replace the `AbsoluteFill` style:

```typescript
background: isLD ? "#FFFFFF" : "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
```

Replace the "Claude Code · Tutorial" label color:

```typescript
color: isLD ? "#CC3333" : "#7ee787",
```

Change text to:

```tsx
{isLD ? "Línea Directa · Claude Code" : "Claude Code · Tutorial"}
```

Replace the title color:

```typescript
color: isLD ? "#1A1A1A" : "#f0f6fc",
```

Replace the line gradient:

```typescript
background: isLD ? "#CC3333" : "linear-gradient(90deg, #7ee787, #79c0ff)",
```

Replace the subtitle color:

```typescript
color: isLD ? "#888888" : "#8b949e",
```

Add the mascot above the label (inside the `AbsoluteFill`, as the first child):

```tsx
{isLD && (
  <div style={{ marginBottom: 24 }}>
    <PixelPhoneMascot scale={1} animate={true} />
  </div>
)}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx
git commit -m "feat: add Linea Directa theme support to IntroScene"
```

---

### Task 6: Update CalloutScene with theme support

**Files:**
- Modify: `src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx`

- [ ] **Step 1: Add theme import**

```typescript
import { useTheme } from "../ThemeContext"
```

- [ ] **Step 2: Use theme in the component**

After the existing hooks, add:

```typescript
const theme = useTheme()
const isLD = theme === "linea-directa"
```

- [ ] **Step 3: Update the styles**

Outer `AbsoluteFill` background:

```typescript
background: isLD
  ? "#FFFFFF"
  : background === "overlay" ? "rgba(0,0,0,0.65)" : "#0d1117",
```

Inner card `background`:

```typescript
background: isLD ? "#FFFFFF" : "linear-gradient(135deg, #161b22 0%, #21262d 100%)",
```

Inner card `border`:

```typescript
border: isLD ? "1px solid #EFEFEF" : "1px solid #30363d",
```

Inner card `borderLeft`:

```typescript
borderLeft: isLD ? "4px solid #CC3333" : "4px solid #7ee787",
```

Inner card `boxShadow`:

```typescript
boxShadow: isLD ? "0 4px 20px rgba(0,0,0,0.08)" : "0 12px 40px rgba(0,0,0,0.5)",
```

Text `color`:

```typescript
color: isLD ? "#1A1A1A" : "#f0f6fc",
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx
git commit -m "feat: add Linea Directa theme support to CalloutScene"
```

---

### Task 7: Update OutroScene with theme support

**Files:**
- Modify: `src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { useTheme } from "../ThemeContext"
import { PixelPhoneMascot } from "../components/PixelPhoneMascot"
```

- [ ] **Step 2: Use theme in the component**

After existing hooks:

```typescript
const theme = useTheme()
const isLD = theme === "linea-directa"
```

- [ ] **Step 3: Update styles**

`AbsoluteFill` background:

```typescript
background: isLD ? "#FFFFFF" : "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
```

Title color:

```typescript
color: isLD ? "#1A1A1A" : "#f0f6fc",
```

Bullet dot background:

```typescript
background: isLD ? "#CC3333" : "#7ee787",
```

Bullet text color:

```typescript
color: isLD ? "#555555" : "#8b949e",
```

Footer text — replace "Claude Code Tutorials" with:

```tsx
{isLD ? "Línea Directa · Claude Code" : "Claude Code Tutorials"}
```

Footer text color:

```typescript
color: isLD ? "#CC3333" : "#484f58",
```

- [ ] **Step 4: Add small mascot in the outro**

After the footer div, add:

```tsx
{isLD && (
  <div style={{ position: "absolute", bottom: 30, right: 40, opacity: 0.6 }}>
    <PixelPhoneMascot scale={0.6} animate={false} />
  </div>
)}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx
git commit -m "feat: add Linea Directa theme support to OutroScene"
```

---

### Task 8: Update ClaudeCodeTutorial.tsx — ThemeContext + ScreenRecordingScene

**Files:**
- Modify: `src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { ThemeContext } from "./ThemeContext"
import { ScreenRecordingScene } from "./scenes/ScreenRecordingScene"
```

- [ ] **Step 2: Wrap with ThemeContext and update background**

Replace the entire component body:

```tsx
export const ClaudeCodeTutorial: React.FC<TutorialConfig> = (config) => {
  const bg = config.theme === "linea-directa" ? "#FFFFFF" : "#0d1117"
  return (
    <ThemeContext.Provider value={config.theme ?? "default"}>
      <AbsoluteFill style={{ background: bg }}>
        <Series>
          {config.scenes.map((scene, i) => {
            const durationInFrames = Math.ceil(scene.durationInSeconds * config.fps)
            return (
              <Series.Sequence key={i} durationInFrames={durationInFrames}>
                {scene.type === "intro" && <IntroScene {...scene} />}
                {scene.type === "terminal" && <TerminalScene {...scene} fps={config.fps} />}
                {scene.type === "callout" && <CalloutScene {...scene} />}
                {scene.type === "outro" && <OutroScene {...scene} />}
                {scene.type === "custom" && <CustomScene {...scene} />}
                {scene.type === "screenRecording" && <ScreenRecordingScene {...scene} fps={config.fps} />}
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx
git commit -m "feat: integrate ThemeContext and ScreenRecordingScene in main composition"
```

---

### Task 9: Update render.ts — asset resolution

**Files:**
- Modify: `scripts/render.ts`

- [ ] **Step 1: Add fs imports and asset copy logic**

Add to imports:

```typescript
import { copyFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "fs"
```

After reading the config (`const config = ...`), add asset resolution:

```typescript
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
```

- [ ] **Step 2: Add cleanup in try/finally**

Inside `main()`, wrap everything from `console.log("📦 Bundling...")` to the final `console.log("✅ ...")` in a try/finally. The asset resolution code from Step 1 goes BEFORE the try block (it's already inside `main()` after `const config = ...`). The full structure of `main()` becomes:

```typescript
async function main() {
  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  const outputPath = path.join(path.dirname(configPath), "output.mp4")

  // --- Asset resolution (from Step 1) goes here ---

  try {
    // --- Existing bundle + render code ---
    console.log("📦 Bundling composition...")
    // ... (unchanged) ...
    console.log(`\n✅ Video generated: ${outputPath}`)
  } finally {
    // Clean up copied assets
    for (const dir of assetsToCopy) {
      rmSync(dir, { recursive: true, force: true })
    }
    // Clean up parent if empty
    const parentDir = path.join("public", "tutorial-assets")
    if (existsSync(parentDir)) {
      const remaining = readdirSync(parentDir)
      if (remaining.length === 0) rmSync(parentDir, { recursive: true, force: true })
    }
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add scripts/render.ts
git commit -m "feat: add asset resolution and cleanup for screenRecording scenes"
```

---

### Task 10: Update .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add new gitignore entries**

After the line `tutorials/*/output.mp4`, add:

```
tutorials/*/assets/*.mp4
public/tutorial-assets/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore VHS recordings and temp tutorial assets"
```

---

### Task 11: Update defaultProps in Root.tsx

> **Note:** The spec says Root.tsx is "not modified", but `defaultTutorialProps` must satisfy the updated schema which now includes `theme`. This is a necessary correction.

**Files:**
- Modify: `src/Root.tsx`

- [ ] **Step 1: Add `theme` to defaultTutorialProps**

In the `defaultTutorialProps` object, add after `height`:

```typescript
theme: "default" as const,
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/Root.tsx
git commit -m "feat: add theme to default tutorial props"
```

---

### Task 12: Smoke test — render existing tutorial with linea-directa theme

**Files:**
- Modify: `tutorials/git-worktrees-claude-code/config.json`

- [ ] **Step 1: Add `theme` field to config**

Add `"theme": "linea-directa"` to the config JSON (after `"description"`).

- [ ] **Step 2: Render**

Run: `npx tsx scripts/render.ts tutorials/git-worktrees-claude-code/config.json`
Expected: Renders successfully with white background, red accents, mascot in intro/outro.

- [ ] **Step 3: Visually verify the output**

Open `tutorials/git-worktrees-claude-code/output.mp4` and check:
- Intro: white bg, red accent line, mascot pixel art, "Línea Directa · Claude Code" label
- Callout: white bg, red left border
- Outro: white bg, red bullets, small mascot in corner, "Línea Directa · Claude Code" footer

- [ ] **Step 4: Iterate on PixelPhoneMascot if needed**

If the pixel art doesn't look right, adjust the `PIXEL_MAP` in `PixelPhoneMascot.tsx` and re-render.

- [ ] **Step 5: Commit final config**

```bash
git add tutorials/git-worktrees-claude-code/config.json
git commit -m "feat: apply linea-directa theme to git-worktrees tutorial"
```

---

### Task 13: Update SKILL.md with VHS workflow and theme docs

**Files:**
- Modify: `.claude/skills/tutorial-generator/SKILL.md`

- [ ] **Step 1: Update the skill description**

Change the first line from "terminal simulada" to "terminal real (VHS) o simulada."

- [ ] **Step 2: Add VHS step between Research and config.json generation**

Add a new "Paso 2.5: Genera recording.tape" section documenting:
- Tape file format with the key VHS commands (Output, Set, Type, Enter, Wait, Sleep)
- Default theme: Catppuccin Mocha, FontSize 18, Width 1200, Height 600
- WaitTimeout 60s
- How to execute: `cd tutorials/[slug] && vhs recording.tape`
- Fallback: if VHS not installed or fails, use TerminalScene simulation

- [ ] **Step 3: Document `theme` field and `screenRecording` scene**

Add to the config.json section:
- `theme: "default" | "linea-directa"` — controls brand styling across all scenes
- `screenRecording` scene type with `src`, `trim`, `frame`, `durationInSeconds`
- When to prefer `screenRecording` over `terminal`: when you need authentic terminal output

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/tutorial-generator/SKILL.md
git commit -m "docs: update tutorial-generator skill with VHS workflow and theme support"
```
