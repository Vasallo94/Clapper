# Audio-Visual Sync Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate dead air in video scenes by replacing the agent-driven timing model with an auto-calculated system based on a Scene Timing Registry and a mandatory Two-Phase Animation Pattern.

**Architecture:** Four-layer defense: (1) new React hooks + registry for timing, (2) scene component refactors, (3) agent prompt/skill updates, (4) validation + runtime guardrails. Each layer is independently testable. The rendering code auto-calculates audio start from each scene type's registered `visualReadyMs` — agents never generate timing arithmetic again.

**Tech Stack:** React/Remotion (TypeScript), Python (LangGraph agent), Zod schemas, Vitest

**Spec:** `docs/superpowers/specs/2026-05-13-audio-visual-sync-design.md`

---

## File Structure

### New files

| File                                                | Purpose                                                        |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `src/shared/hooks/usePhase1Entry.ts`                | Fast entry hook (max 200ms opacity+scale) for Phase 1 elements |
| `src/shared/hooks/useBeatReveal.ts`                 | Beat-driven reveal hook for Phase 2 elements                   |
| `src/shared/sceneTimingRegistry.ts`                 | Central registry mapping scene types → visualReadyMs           |
| `packages/agent/skills/scene-timing-guide/SKILL.md` | New skill teaching agents the Two-Phase timing model           |

### Modified files — rendering infrastructure

| File                                   | Change                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `src/utils/direction.ts`               | Add `getVisualReadyMs()` helper, deprecate `getSceneMotionDelayMs()` for Phase 1 |
| `src/utils/calculateMetadata.ts`       | Auto-calculate audioStartMs from registry, log overrides                         |
| `src/shared/useScenePrecomputation.ts` | Use registry for audioDelayFrames instead of timing.leadInMs                     |

### Modified files — scene components (35 scenes)

| Group                   | Files                                                         | Pattern                                                      |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Built-in scenes         | `IntroScene`, `CalloutScene`, `OutroScene`, `TerminalScene`   | Replace slow springs with `usePhase1Entry` + `useBeatReveal` |
| Custom scenes (26)      | `BulletSlideScene`, `IconGridScene`, `SplitScreenScene`, etc. | Same pattern — Phase 1 for title/frame, Phase 2 for items    |
| ProductShort scenes (4) | `HeroScene`, `BenefitsScene`, `PricingScene`, `CtaScene`      | Same pattern                                                 |

### Modified files — agent pipeline

| File                                                  | Change                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/agent/prompts/director.md`                  | Remove leadInMs/audioStartMs guidance, add scene-timing-guide reference |
| `packages/agent/prompts/audio_planner.md`             | Remove per-scene timing overrides, simplify voiceover format            |
| `packages/agent/prompts/scene_creator.md`             | Add mandatory Two-Phase pattern + visualReadyMs registration            |
| `packages/agent/prompts/copywriter.md`                | Add duration-content density awareness                                  |
| `packages/agent/skills/scene-catalog/SKILL.md`        | Add visualReadyMs, phase1, phase2 per scene type                        |
| `packages/agent/skills/remotion-director/SKILL.md`    | Remove timing field guidance, reference scene-timing-guide              |
| `packages/agent/skills/video-best-practices/SKILL.md` | Mark leadInMs/audioStartMs as deprecated                                |

### Modified files — validation

| File                                            | Change                            |
| ----------------------------------------------- | --------------------------------- |
| `packages/agent/src/tools/validation.py`        | Add 5 new timing validation rules |
| `packages/agent/tests/test_tools_validation.py` | Tests for new validation rules    |

---

## Phase 1: Foundation (hooks + registry + runtime)

### Task 1: Create usePhase1Entry hook

**Files:**

- Create: `src/shared/hooks/usePhase1Entry.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/shared/hooks/usePhase1Entry.ts
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion"

interface Phase1EntryOptions {
  durationMs?: number
}

interface Phase1EntryResult {
  opacity: number
  scale: number
  progress: number
}

export function usePhase1Entry(options: Phase1EntryOptions = {}): Phase1EntryResult {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const durationMs = Math.min(options.durationMs ?? 150, 200)
  const durationFrames = Math.max(1, Math.round((durationMs / 1000) * fps))

  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const opacity = interpolate(progress, [0, 0.6], [0, 1], { extrapolateRight: "clamp" })
  const scale = interpolate(progress, [0, 1], [0.97, 1], { extrapolateRight: "clamp" })

  return { opacity, scale, progress }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm run lint`
Expected: No errors related to usePhase1Entry

- [ ] **Step 3: Commit**

```bash
git add src/shared/hooks/usePhase1Entry.ts
git commit -m "feat: add usePhase1Entry hook for fast scene entry (max 200ms)"
```

---

### Task 2: Create useBeatReveal hook

**Files:**

- Create: `src/shared/hooks/useBeatReveal.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/shared/hooks/useBeatReveal.ts
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { Beat } from "../schemas"
import { getBeatStartFrame } from "../../utils/direction"

interface BeatRevealOptions {
  beat?: Beat | null
  fallbackDelayMs?: number
  animationMs?: number
}

interface BeatRevealResult {
  opacity: number
  y: number
  progress: number
  visible: boolean
}

export function useBeatReveal(options: BeatRevealOptions = {}): BeatRevealResult {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const { beat, fallbackDelayMs = 200, animationMs = 300 } = options

  const startFrame = beat ? getBeatStartFrame(beat, fps) : Math.round((fallbackDelayMs / 1000) * fps)

  const durationFrames = Math.max(1, Math.round((animationMs / 1000) * fps))
  const localFrame = Math.max(0, frame - startFrame)

  const s = spring({
    frame: localFrame,
    fps,
    config: { damping: 28, stiffness: 200 },
    durationInFrames: durationFrames,
  })

  const opacity = interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })
  const y = interpolate(s, [0, 1], [15, 0])

  return {
    opacity,
    y,
    progress: s,
    visible: frame >= startFrame,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm run lint`
Expected: No errors related to useBeatReveal

- [ ] **Step 3: Commit**

```bash
git add src/shared/hooks/useBeatReveal.ts
git commit -m "feat: add useBeatReveal hook for beat-driven progressive reveal"
```

---

### Task 3: Create Scene Timing Registry

**Files:**

- Create: `src/shared/sceneTimingRegistry.ts`

- [ ] **Step 1: Create the registry**

```typescript
// src/shared/sceneTimingRegistry.ts

interface SceneTimingEntry {
  visualReadyMs: number
}

export const sceneTimingRegistry: Record<string, SceneTimingEntry> = {
  // Built-in scenes
  intro: { visualReadyMs: 100 },
  terminal: { visualReadyMs: 150 },
  callout: { visualReadyMs: 100 },
  outro: { visualReadyMs: 100 },

  // ProductShort scenes
  hero: { visualReadyMs: 100 },
  benefits: { visualReadyMs: 100 },
  pricing: { visualReadyMs: 100 },
  cta: { visualReadyMs: 100 },

  // Custom scenes
  "annotated-image": { visualReadyMs: 100 },
  "api-request": { visualReadyMs: 150 },
  "bar-chart": { visualReadyMs: 100 },
  "before-after": { visualReadyMs: 100 },
  "big-number": { visualReadyMs: 100 },
  "block-diagram": { visualReadyMs: 150 },
  "browser-mockup": { visualReadyMs: 150 },
  "bullet-slide": { visualReadyMs: 100 },
  "chapter-card": { visualReadyMs: 100 },
  "code-block": { visualReadyMs: 150 },
  "code-diff": { visualReadyMs: 150 },
  "comparison-table": { visualReadyMs: 100 },
  countdown: { visualReadyMs: 100 },
  "file-explorer": { visualReadyMs: 150 },
  "flow-diagram": { visualReadyMs: 150 },
  "icon-grid": { visualReadyMs: 100 },
  "logo-wall": { visualReadyMs: 100 },
  "media-card": { visualReadyMs: 100 },
  "problem-solution": { visualReadyMs: 100 },
  "progress-bars": { visualReadyMs: 100 },
  quote: { visualReadyMs: 100 },
  "split-screen": { visualReadyMs: 100 },
  "stat-reveal": { visualReadyMs: 100 },
  "step-list": { visualReadyMs: 100 },
  timeline: { visualReadyMs: 100 },
  "two-column-text": { visualReadyMs: 100 },
}

export const DEFAULT_VISUAL_READY_MS = 200

export function getVisualReadyMs(sceneType: string, componentId?: string): number {
  const key = sceneType === "custom" && componentId ? componentId : sceneType
  return sceneTimingRegistry[key]?.visualReadyMs ?? DEFAULT_VISUAL_READY_MS
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/sceneTimingRegistry.ts
git commit -m "feat: add scene timing registry with visualReadyMs per scene type"
```

---

### Task 4: Wire runtime guardrails into rendering pipeline

**Files:**

- Modify: `src/utils/direction.ts`
- Modify: `src/utils/calculateMetadata.ts`
- Modify: `src/shared/useScenePrecomputation.ts`

- [ ] **Step 1: Update direction.ts — add getVisualReadyMs re-export**

In `src/utils/direction.ts`, add the re-export at the top of the file alongside other exports:

```typescript
// Add to the re-exports from shared/schemas section
export { getVisualReadyMs, DEFAULT_VISUAL_READY_MS } from "../shared/sceneTimingRegistry"
```

- [ ] **Step 2: Update calculateMetadata.ts — auto-calculate audioStartMs from registry**

In `src/utils/calculateMetadata.ts`, add the import:

```typescript
import { getVisualReadyMs } from "../shared/sceneTimingRegistry"
```

Then modify the `createCalculateMetadata` function. Replace the section that calls `getDirectedSceneDurationInSeconds` (lines 78-83) with:

```typescript
const visualReadyMs = getVisualReadyMs(
  scene.type ?? "",
  (scene as Record<string, unknown>).componentId as string | undefined,
)

const effectiveTiming: Timing = {
  ...timing,
  audioStartMs: Math.max(visualReadyMs, timing?.audioStartMs ?? 0),
  leadInMs: 0,
}

if (timing?.audioStartMs !== undefined && timing.audioStartMs < visualReadyMs) {
  console.warn(
    `[timing-sync] Scene ${index}: audioStartMs ${timing.audioStartMs}ms ` +
      `overridden to ${visualReadyMs}ms (visualReadyMs for ${scene.type ?? "unknown"})`,
  )
}
if (timing?.leadInMs && timing.leadInMs > 0) {
  console.warn(`[timing-sync] Scene ${index}: leadInMs ${timing.leadInMs}ms ignored. Phase 1 starts at frame 0.`)
}

return {
  ...mergedScene,
  durationInSeconds: Math.max(
    1,
    roundSeconds(
      getDirectedSceneDurationInSeconds({
        audioDurationInSeconds: audioDuration,
        timing: effectiveTiming,
      }),
    ),
  ),
}
```

- [ ] **Step 3: Update useScenePrecomputation.ts — use registry for audioDelayFrames**

In `src/shared/useScenePrecomputation.ts`, add the import:

```typescript
import { getVisualReadyMs } from "./sceneTimingRegistry"
```

Then replace the `audioDelayFrames` calculation (line 50) with:

```typescript
const visualReadyMs = getVisualReadyMs(scene.type, scene.componentId)
const effectiveAudioDelayMs = Math.max(visualReadyMs, getSceneAudioDelayMs(timing) || 0)
const audioDelayFrames = msToFrames(effectiveAudioDelayMs, config.fps)
```

- [ ] **Step 4: Verify TypeScript compiles and existing tests pass**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/utils/direction.ts src/utils/calculateMetadata.ts src/shared/useScenePrecomputation.ts
git commit -m "feat: wire runtime guardrails — auto-calculate audioStartMs from scene registry"
```

---

## Phase 2: Scene Component Refactors

Each scene needs to replace slow spring entrances with usePhase1Entry (for core layout) and useBeatReveal (for items). The pattern is the same for every scene — here are representative tasks for each category. The remaining scenes follow the identical pattern.

### Task 5: Refactor BulletSlideScene (template for custom scenes)

**Files:**

- Modify: `src/compositions/ClaudeCodeTutorial/scenes/custom/BulletSlideScene.tsx`

This is the template — all other custom scene refactors follow this exact pattern.

- [ ] **Step 1: Replace imports**

Replace the direction imports:

```typescript
// OLD
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

// NEW
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"
```

- [ ] **Step 2: Replace animation logic in the component body**

Replace the title/subtitle/accent animation block (lines 96-128) with:

```typescript
const phase1 = usePhase1Entry({ durationMs: 100 })
const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

const items = normalizeItems(props.items)

// Accent line — instant with Phase 1
const lineWidth = interpolate(phase1.progress, [0.3, 1], [0, 60], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
})
```

- [ ] **Step 3: Update the JSX — title and subtitle use Phase 1 opacity**

For the title div, change `opacity: titleOpacity` and `transform: translateY(${titleY}px)` to:

```typescript
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
```

For the subtitle div, change `opacity: subtitleOpacity` to:

```typescript
          opacity: phase1.opacity * 0.7,
```

- [ ] **Step 4: Update item animations to use useBeatReveal**

Replace the item animation logic inside the map (lines 185-194) with:

```typescript
const itemBeat = beats?.[i + 1] ?? null
const itemReveal = useBeatReveal({
  beat: itemBeat,
  fallbackDelayMs: 200 + i * 150,
  animationMs: 250,
})
```

**Note:** `useBeatReveal` is a hook and cannot be called inside a `.map()` callback. This needs to be restructured. Extract the item rendering into a separate component:

Create a `BulletItem` component inside the same file:

```typescript
const BulletItem: React.FC<{
  item: BulletItem_
  beat: Beat | null
  index: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ item, beat, index, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 200 + index * 150,
    animationMs: 250,
  })

  const IconComponent = item.icon ? iconLookup[item.icon] : null

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {/* Icon or dot — same JSX as before */}
      {IconComponent ? (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `${tokens.primary}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconComponent size={20} color={tokens.primary} />
        </div>
      ) : (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: tokens.primary,
            flexShrink: 0,
            marginLeft: 14,
            marginRight: 14,
          }}
        />
      )}
      <span
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 24,
          color: tokens.foreground,
          lineHeight: 1.4,
        }}
      >
        {item.text}
      </span>
    </div>
  )
}
```

Then in the items map, replace with:

```typescript
        {items.map((item, i) => (
          <BulletItem
            key={i}
            item={item}
            beat={beats?.[i + 1] ?? null}
            index={i}
            tokens={tokens}
          />
        ))}
```

- [ ] **Step 5: Remove unused imports**

Remove `spring`, `getSceneMotionDelayMs`, `msToFrames` if no longer used. Keep `interpolate`, `useCurrentFrame`, `useVideoConfig` (still needed for accent line).

- [ ] **Step 6: Verify TypeScript compiles**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 7: Visual test in Remotion Studio**

Run: `pnpm run dev`
Open a composition with a BulletSlide scene. Verify:

- Title appears within ~100ms (Phase 1)
- Items appear progressively on their beats (or staggered if no beats)
- No blank screen at scene start

- [ ] **Step 8: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/BulletSlideScene.tsx
git commit -m "refactor(BulletSlideScene): adopt Two-Phase animation pattern"
```

---

### Task 6: Refactor IconGridScene

**Files:**

- Modify: `src/compositions/ClaudeCodeTutorial/scenes/custom/IconGridScene.tsx`

Follow the exact same pattern as Task 5:

- [ ] **Step 1: Replace imports** — add `usePhase1Entry`, `useBeatReveal`, remove `getSceneMotionDelayMs`, `msToFrames`

- [ ] **Step 2: Replace title animation** — use `phase1.opacity` instead of `titleOpacity` calculated from interpolate

- [ ] **Step 3: Extract GridItem component** — hooks can't be called in .map(), so extract into a component:

```typescript
const GridItemCard: React.FC<{
  item: GridItem
  beat: Beat | null
  index: number
  tokens: ReturnType<typeof useThemeTokens>
  cardWidth: number
}> = ({ item, beat, index, tokens, cardWidth }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 200 + index * 150,
    animationMs: 250,
  })

  const accent = item.accent || tokens.primary
  const IconComponent = iconLookup[item.icon] || CodeIcon

  return (
    <div
      style={{
        width: cardWidth,
        background: tokens.card.bg,
        border: `1px solid ${tokens.card.border}`,
        borderRadius: 10,
        padding: "24px 20px",
        opacity,
        transform: `translateY(${y}px)`,
        boxShadow: tokens.card.shadow,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: `${accent}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconComponent size={24} color={accent} />
      </div>
      <div style={{ fontFamily: tokens.fontFamily, fontSize: 20, fontWeight: 700, color: tokens.foreground }}>
        {item.title}
      </div>
      <div style={{ fontFamily: tokens.fontFamily, fontSize: 16, color: tokens.foreground, opacity: 0.7, lineHeight: 1.5 }}>
        {item.description}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Remove unused imports, verify lint passes**

Run: `pnpm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/IconGridScene.tsx
git commit -m "refactor(IconGridScene): adopt Two-Phase animation pattern"
```

---

### Task 7: Refactor SplitScreenScene

**Files:**

- Modify: `src/compositions/ClaudeCodeTutorial/scenes/custom/SplitScreenScene.tsx`

Same pattern — Phase 1 for title + column structure, Phase 2 via useBeatReveal for individual items. Extract panel items into a sub-component for hook compliance.

- [ ] **Step 1: Replace imports, add usePhase1Entry and useBeatReveal**
- [ ] **Step 2: Use phase1.opacity for title, separator, column headers**
- [ ] **Step 3: Extract PanelItem component using useBeatReveal per item**
- [ ] **Step 4: Verify lint passes, commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/SplitScreenScene.tsx
git commit -m "refactor(SplitScreenScene): adopt Two-Phase animation pattern"
```

---

### Task 8: Refactor remaining custom scenes (batch)

**Files:** All remaining custom scenes in `src/compositions/ClaudeCodeTutorial/scenes/custom/`

For each scene, apply the same pattern:

1. Import `usePhase1Entry` and `useBeatReveal`
2. Replace title/frame/container animations with `usePhase1Entry({ durationMs: 100 })`
3. Replace item/element animations with `useBeatReveal` (extract sub-component if using .map())
4. Remove `getSceneMotionDelayMs` and `msToFrames` imports if no longer needed

Scenes to refactor (in alphabetical order):

- `AnnotatedImageScene.tsx` — Phase 1: image frame. Phase 2: annotations via useBeatReveal
- `ApiRequestScene.tsx` — Phase 1: request card frame. Phase 2: response reveal
- `BarChartScene.tsx` — Phase 1: title + axis. Phase 2: bars fill
- `BeforeAfterScene.tsx` — Phase 1: title + frames. Phase 2: content reveal
- `BigNumberScene.tsx` — Phase 1: label. Phase 2: number counts up
- `BlockDiagramScene.tsx` — Phase 1: title + block outlines. Phase 2: blocks fill + arrows
- `BrowserMockupScene.tsx` — Phase 1: chrome + title. Phase 2: content blocks
- `ChapterCardScene.tsx` — Phase 1: number + title. Phase 2: subtitle + description
- `CodeBlockScene.tsx` — Phase 1: card chrome + title. Phase 2: lines reveal
- `CodeDiffScene.tsx` — Phase 1: file header. Phase 2: diff lines
- `ComparisonTableScene.tsx` — Phase 1: title + headers. Phase 2: rows
- `CountdownScene.tsx` — Phase 1: frame. Phase 2: numbers
- `FileExplorerScene.tsx` — Phase 1: tree sidebar. Phase 2: files expand + content
- `FlowDiagramScene.tsx` — Phase 1: title + node outlines. Phase 2: connections draw
- `LogoWallScene.tsx` — Phase 1: title. Phase 2: logos appear
- `MediaCardScene.tsx` — Phase 1: image + title. Phase 2: description + CTA
- `ProblemSolutionScene.tsx` — Phase 1: title. Phase 2: problem then solution
- `ProgressBarsScene.tsx` — Phase 1: title. Phase 2: bars fill
- `QuoteScene.tsx` — Phase 1: quote marks. Phase 2: text + attribution
- `StatRevealScene.tsx` — Phase 1: label. Phase 2: number + bar
- `StepListScene.tsx` — Phase 1: title. Phase 2: steps reveal
- `TimelineScene.tsx` — Phase 1: title + line. Phase 2: events appear
- `TwoColumnTextScene.tsx` — Phase 1: title + columns. Phase 2: content

- [ ] **Step 1: Refactor each scene** following the Task 5 pattern exactly
- [ ] **Step 2: For each scene with a .map() of items, extract a sub-component** so hooks are called at component top level
- [ ] **Step 3: Run lint after each scene** — `pnpm run lint`
- [ ] **Step 4: Commit in batches of 4-5 scenes**

```bash
git commit -m "refactor(custom-scenes): adopt Two-Phase pattern for [list scenes]"
```

---

### Task 9: Refactor built-in scenes (IntroScene, CalloutScene, OutroScene)

**Files:**

- Modify: `src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx`

TerminalScene is excluded — its typing animation IS the content reveal (Phase 2), and the terminal chrome appears with its own spring which is already fast enough. Just ensure the terminal chrome entry uses Phase 1 if it doesn't already.

- [ ] **Step 1: IntroScene** — Replace lockupOpacity/titleSpring/subtitleSpring with `usePhase1Entry({ durationMs: 100 })`. Title, lockup, subtitle all use `phase1.opacity`. Keep accent line behavior (waits for first narrated beat — already Phase 2 style).

- [ ] **Step 2: CalloutScene** — Replace `enterSpring` (600ms) with `usePhase1Entry({ durationMs: 100 })`. Card appears instantly with phase1 opacity/scale.

- [ ] **Step 3: OutroScene** — Replace `useSlideIn` title entry with `usePhase1Entry`. Keep bullet reveals as Phase 2 via `useBeatReveal`.

- [ ] **Step 4: Run lint, verify in Studio**

Run: `pnpm run lint && pnpm run dev`

- [ ] **Step 5: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx \
  src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx \
  src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx
git commit -m "refactor(built-in-scenes): adopt Two-Phase animation pattern"
```

---

### Task 10: Refactor ProductShort scenes

**Files:**

- Modify: `src/compositions/ProductShort/scenes/HeroScene.tsx`
- Modify: `src/compositions/ProductShort/scenes/BenefitsScene.tsx`
- Modify: `src/compositions/ProductShort/scenes/PricingScene.tsx`
- Modify: `src/compositions/ProductShort/scenes/CtaScene.tsx`

- [ ] **Step 1: HeroScene** — Replace mascot bounce spring + useSlideIn with `usePhase1Entry`. Mascot, text, background all instant. Keep pulse animations as decorative (not Phase 2).

- [ ] **Step 2: BenefitsScene** — Replace `useSlideIn` title + staggered item springs with `usePhase1Entry` for title and `useBeatReveal` (or staggered fallback) for items. Extract item into sub-component for hook compliance.

- [ ] **Step 3: PricingScene** — Replace bouncy price spring with `usePhase1Entry`. Keep number count-up as Phase 2 if it's beat-driven.

- [ ] **Step 4: CtaScene** — Replace pulse ring springs + useSlideIn with `usePhase1Entry`. CTA text instant, pulse rings decorative.

- [ ] **Step 5: Run lint, commit**

```bash
git add src/compositions/ProductShort/scenes/
git commit -m "refactor(ProductShort): adopt Two-Phase animation pattern for all scenes"
```

---

## Phase 3: Agent Pipeline (prompts + skills)

### Task 11: Create scene-timing-guide skill

**Files:**

- Create: `packages/agent/skills/scene-timing-guide/SKILL.md`

- [ ] **Step 1: Create the skill directory and file**

```markdown
# Scene Timing Guide

## Two-Phase Animation Pattern

Every scene in this platform uses a Two-Phase animation model. You do NOT need to set animation timing — the platform handles it automatically.

### Phase 1: Instant Entry (0-200ms)

Core layout appears immediately when the scene starts:

- Title text
- Card/container frames
- Background elements
- Grid/column structure

The viewer instantly sees WHAT this scene is about.

### Phase 2: Progressive Reveal (beat-driven)

Supporting elements appear as the voice mentions them:

- Bullet points → each on its narration beat
- Diagram nodes → draw as voice describes flow
- Stats/numbers → count up when voice cites them
- Highlights → emphasize what voice discusses

## What You Generate

| Field          | Generate?       | Notes                                                              |
| -------------- | --------------- | ------------------------------------------------------------------ |
| `beats[]`      | YES             | Creative sync points — one beat per narrative point                |
| `tailHoldMs`   | OPTIONAL        | Only if scene needs extra hold (CTA, brand). Default 350ms is fine |
| `transitionMs` | OPTIONAL        | Cross-fade duration between scenes (0-1500ms)                      |
| `leadInMs`     | NO — DEPRECATED | Auto-calculated from scene registry. Do not set.                   |
| `audioStartMs` | NO — DEPRECATED | Auto-calculated from scene registry. Do not set.                   |

## Key Principle

**You decide WHAT to show and WHAT to say. The platform decides WHEN to sync them.**

Audio automatically starts when the scene's visuals are ready. You don't need to calculate or guess millisecond values.

## Beat Placement Rules

1. First beat `startMs` must be >= the scene's `visualReadyMs` (typically 100-150ms)
2. Space beats at least 500ms apart
3. Each beat should have: `id`, `startMs`, `narration` (what voice says), `visual` (what appears)
4. Leave >= 500ms between last beat and scene end

## Duration-Content Rules

For scenes with countable items (bullet-slide, icon-grid, benefits):

- Minimum: 2.5 seconds per item + 1.5 seconds overhead
- Example: 4 items → minimum 11.5 seconds

## visualReadyMs Reference

| Scene Type       | visualReadyMs | Phase 1 Elements             |
| ---------------- | ------------- | ---------------------------- |
| intro            | 100ms         | Title, lockup, background    |
| terminal         | 150ms         | Window chrome, status bar    |
| callout          | 100ms         | Card frame, icon, title      |
| outro            | 100ms         | Title, brand, CTA            |
| bullet-slide     | 100ms         | Title, subtitle, accent line |
| icon-grid        | 100ms         | Title, grid layout frame     |
| split-screen     | 100ms         | Title, columns, separator    |
| code-block       | 150ms         | Card chrome, title, filename |
| flow-diagram     | 150ms         | Title, node outlines         |
| comparison-table | 100ms         | Title, column headers, frame |
| stat-reveal      | 100ms         | Label, container             |
| file-explorer    | 150ms         | File tree sidebar            |
| quote            | 100ms         | Quote marks, card background |
| block-diagram    | 150ms         | Title, block outlines        |
| All others       | 100-150ms     | Title + structural frame     |
| Unregistered     | 200ms         | Default fallback             |

## Dead Air Definition

**Dead air** = voice playing while the screen has no visible content. This is FORBIDDEN.

The platform prevents this automatically by delaying audio start until `visualReadyMs`. But you must also avoid placing beats before `visualReadyMs`.
```

- [ ] **Step 2: Commit**

```bash
git add packages/agent/skills/scene-timing-guide/SKILL.md
git commit -m "feat: add scene-timing-guide skill for Two-Phase animation model"
```

---

### Task 12: Update director prompt

**Files:**

- Modify: `packages/agent/prompts/director.md`

- [ ] **Step 1: Add scene-timing-guide to the reads list** at the top of the prompt

- [ ] **Step 2: Remove deprecated timing guidance**

Remove or replace these lines:

- "Never start a video with voice + major visual movement on the same frame"
- "If voiceover exists, intro needs `leadInMs` (minimum 300ms)"
- Any guidance about setting `leadInMs` or `audioStartMs` values
- Any examples showing `leadInMs: 200` or `audioStartMs: 150`

- [ ] **Step 3: Add new timing guidance**

Add a section:

```markdown
## Audio Sync (auto-calculated)

Audio sync is AUTO-CALCULATED from the scene timing registry. Do NOT set `leadInMs` or `audioStartMs` — they are deprecated and will be ignored.

Your job: define **beats** that sync narration with visual reveals.

- First beat `startMs` must be >= the scene's `visualReadyMs` (see scene-timing-guide skill)
- Each beat needs: `id`, `startMs`, `narration` (what voice says), `visual` (what appears)
- `tailHoldMs`: set only if the scene needs extra hold (CTA, brand moment). Default 350ms is fine.

The `timing` object you generate should only contain:

- `tailHoldMs` (optional)
- `transitionMs` (optional, 0-1500ms)
```

- [ ] **Step 4: Commit**

```bash
git add packages/agent/prompts/director.md
git commit -m "refactor(director): remove deprecated timing fields, reference scene-timing-guide"
```

---

### Task 13: Update audio_planner prompt

**Files:**

- Modify: `packages/agent/prompts/audio_planner.md`

- [ ] **Step 1: Add scene-timing-guide to reads list**

- [ ] **Step 2: Remove per-scene timing overrides**

Remove or replace any guidance/examples showing:

```json
"0": { "text": "...", "leadInMs": 500 }
```

Replace with:

````markdown
Audio sync is automatic. Do NOT add `leadInMs` overrides to voiceover scenes.

Voiceover format is always simple:

```json
{
  "scenes": {
    "0": "Texto de la primera escena",
    "1": "Texto de la segunda escena"
  }
}
```
````

The renderer will auto-delay voiceover start until visuals are ready.

````

- [ ] **Step 3: Commit**

```bash
git add packages/agent/prompts/audio_planner.md
git commit -m "refactor(audio_planner): remove timing overrides, simplify voiceover format"
````

---

### Task 14: Update scene_creator prompt

**Files:**

- Modify: `packages/agent/prompts/scene_creator.md`

- [ ] **Step 1: Add scene-timing-guide to reads list**

- [ ] **Step 2: Add mandatory Two-Phase Animation Pattern section**

````markdown
## Two-Phase Animation Pattern (MANDATORY)

Read the scene-timing-guide skill BEFORE creating any component.

All custom scenes MUST follow the Two-Phase Animation Pattern:

1. Use `usePhase1Entry()` for core layout elements (title, card frame, background)
   - Phase 1 must complete in ≤200ms
   - Import from `../../../../shared/hooks/usePhase1Entry`

2. Use `useBeatReveal()` for supporting elements (items, stats, diagrams)
   - Each element appears on its beat's `startMs`
   - If no beats provided, uses auto-staggered entry after Phase 1
   - Import from `../../../../shared/hooks/useBeatReveal`

3. REGISTER TIMING: Export a `visualReadyMs` constant:
   ```typescript
   export const visualReadyMs = 150
   ```
````

This tells the renderer when Phase 1 is complete.

4. For lists of items, extract each item into a separate React component
   (hooks cannot be called inside .map() callbacks)

### Template

```typescript
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"

export const visualReadyMs = 100

const ItemRow: React.FC<{ item: Item; beat: Beat | null; index: number }> = ({ item, beat, index }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 200 + index * 150,
    animationMs: 250,
  })
  return <div style={{ opacity, transform: `translateY(${y}px)` }}>{item.text}</div>
}

export const MyScene: React.FC<Props> = ({ title, items, timing, beats }) => {
  const phase1 = usePhase1Entry({ durationMs: 100 })
  const tokens = useThemeTokens()

  return (
    <AbsoluteFill style={{ background: tokens.backgroundGradient }}>
      <h1 style={{ opacity: phase1.opacity }}>{title}</h1>
      {items.map((item, i) => (
        <ItemRow key={i} item={item} beat={beats?.[i + 1] ?? null} index={i} />
      ))}
    </AbsoluteFill>
  )
}
```

````

- [ ] **Step 3: Remove old useSlideIn/spring entrance examples**

Remove any examples showing the old pattern:
```typescript
const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
````

- [ ] **Step 4: Commit**

```bash
git add packages/agent/prompts/scene_creator.md
git commit -m "refactor(scene_creator): mandate Two-Phase pattern with usePhase1Entry/useBeatReveal"
```

---

### Task 15: Update copywriter prompt

**Files:**

- Modify: `packages/agent/prompts/copywriter.md`

- [ ] **Step 1: Add scene-timing-guide to reads list**

- [ ] **Step 2: Add duration-content density section**

```markdown
## Duration-Content Density

Read the scene-timing-guide skill for duration awareness.

Scene `durationInSeconds` must account for content density:

- A scene with N items needs enough time for voice to describe each one
- Rule of thumb: 2.5 seconds per bullet/item + 1.5 seconds overhead
- Example: 4 bullets → minimum ~11.5s duration

Do NOT set timing fields (`leadInMs`, `audioStartMs`). Only set `durationInSeconds`, `type`, and content.
```

- [ ] **Step 3: Commit**

```bash
git add packages/agent/prompts/copywriter.md
git commit -m "refactor(copywriter): add duration-content density guidance"
```

---

### Task 16: Update existing skills

**Files:**

- Modify: `packages/agent/skills/scene-catalog/SKILL.md`
- Modify: `packages/agent/skills/remotion-director/SKILL.md`
- Modify: `packages/agent/skills/video-best-practices/SKILL.md`

- [ ] **Step 1: scene-catalog** — Add to each scene type entry:

```markdown
- `visualReadyMs`: 100
- Phase 1: [title, frame]
- Phase 2: [items, highlights]
```

- [ ] **Step 2: remotion-director** — Remove leadInMs/audioStartMs examples. Add: "See scene-timing-guide for the Two-Phase timing model. Your beats drive Phase 2 reveals."

- [ ] **Step 3: video-best-practices** — Mark `leadInMs` and `audioStartMs` as DEPRECATED. Add Two-Phase section referencing scene-timing-guide. Update animation rules with usePhase1Entry/useBeatReveal.

- [ ] **Step 4: Commit**

```bash
git add packages/agent/skills/scene-catalog/SKILL.md \
  packages/agent/skills/remotion-director/SKILL.md \
  packages/agent/skills/video-best-practices/SKILL.md
git commit -m "refactor(skills): update scene-catalog, director, best-practices for Two-Phase model"
```

---

## Phase 4: Validation

### Task 17: Add timing validation rules

**Files:**

- Modify: `packages/agent/src/tools/validation.py`
- Modify: `packages/agent/tests/test_tools_validation.py`

- [ ] **Step 1: Add SCENE_VISUAL_READY_MS registry to validation.py**

Add after the `CUSTOM_COMPONENT_REQUIRED_PROPS` dict:

```python
SCENE_VISUAL_READY_MS: dict[str, int] = {
    "intro": 100, "terminal": 150, "callout": 100, "outro": 100,
    "hero": 100, "benefits": 100, "pricing": 100, "cta": 100,
    "bullet-slide": 100, "icon-grid": 100, "split-screen": 100,
    "code-block": 150, "flow-diagram": 150, "comparison-table": 100,
    "stat-reveal": 100, "file-explorer": 150, "quote": 100,
    "block-diagram": 150, "annotated-image": 100, "api-request": 150,
    "bar-chart": 100, "before-after": 100, "big-number": 100,
    "browser-mockup": 150, "chapter-card": 100, "code-diff": 150,
    "countdown": 100, "logo-wall": 100, "media-card": 100,
    "problem-solution": 100, "progress-bars": 100, "step-list": 100,
    "timeline": 100, "two-column-text": 100,
}
DEFAULT_VISUAL_READY_MS = 200

ITEM_COUNT_SCENE_TYPES = {"bullet-slide", "icon-grid", "benefits", "progress-bars", "step-list", "timeline"}
```

- [ ] **Step 2: Add the 5 validation rules in audit_content_quality**

Add these checks inside the `for index, scene in enumerate(scenes)` loop, after the existing checks:

```python
        # --- Timing sync rules ---
        timing = scene.get("timing") if isinstance(scene.get("timing"), dict) else {}
        beats = scene.get("beats", [])
        if not isinstance(beats, list):
            beats = []

        # Rule 1: Legacy timing fields warning
        if timing.get("leadInMs") or timing.get("audioStartMs"):
            warnings.append(
                f"Scene {index}: leadInMs/audioStartMs are deprecated. "
                "Audio sync is auto-calculated from visualReadyMs. Remove these fields."
            )

        # Rule 2: Dead air detection
        scene_type_key = scene.get("componentId", "") if scene_type == "custom" else scene_type
        visual_ready_ms = SCENE_VISUAL_READY_MS.get(scene_type_key, DEFAULT_VISUAL_READY_MS)
        if beats:
            first_beat = beats[0] if isinstance(beats[0], dict) else {}
            first_beat_ms = first_beat.get("startMs", 0)
            if isinstance(first_beat_ms, (int, float)) and first_beat_ms < visual_ready_ms:
                errors.append(
                    f"Scene {index}: first beat at {first_beat_ms}ms starts before "
                    f"visuals are ready ({visual_ready_ms}ms). Move beat to >= {visual_ready_ms}ms."
                )

        vo_scenes = config.get("voiceover", {})
        if isinstance(vo_scenes, dict) and vo_scenes.get("enabled"):
            vo_scene_data = vo_scenes.get("scenes", {})
            if isinstance(vo_scene_data, dict) and str(index) in vo_scene_data and not beats:
                warnings.append(
                    f"Scene {index}: has voiceover but no beats. "
                    "Voice will play without visual sync points."
                )

        # Rule 3: Beat density check
        for bi in range(len(beats) - 1):
            b_curr = beats[bi] if isinstance(beats[bi], dict) else {}
            b_next = beats[bi + 1] if isinstance(beats[bi + 1], dict) else {}
            curr_ms = b_curr.get("startMs", 0)
            next_ms = b_next.get("startMs", 0)
            if isinstance(curr_ms, (int, float)) and isinstance(next_ms, (int, float)):
                gap = next_ms - curr_ms
                if gap < 500:
                    warnings.append(
                        f"Scene {index}: beats '{b_curr.get('id', '?')}' and '{b_next.get('id', '?')}' "
                        f"are only {gap:.0f}ms apart. Minimum recommended: 500ms."
                    )

        # Rule 4: Tail breathing room
        if beats and duration > 0:
            last_beat = beats[-1] if isinstance(beats[-1], dict) else {}
            last_beat_ms = last_beat.get("startMs", 0)
            if isinstance(last_beat_ms, (int, float)):
                tail_room = (duration * 1000) - last_beat_ms
                if tail_room < 300:
                    warnings.append(
                        f"Scene {index}: last beat ends {tail_room:.0f}ms before scene ends. "
                        "Content may feel rushed. Recommend >= 500ms tail."
                    )

        # Rule 5: Duration vs content density
        if scene_type == "custom" and scene_type_key in ITEM_COUNT_SCENE_TYPES:
            props = scene.get("props") or {}
            items = props.get("items", []) if isinstance(props, dict) else []
            if isinstance(items, list) and len(items) > 0:
                min_duration = (len(items) * 2.5) + 1.5
                if duration > 0 and duration < min_duration:
                    warnings.append(
                        f"Scene {index}: {len(items)} items in {duration:.1f}s may feel rushed. "
                        f"Minimum recommended: {min_duration:.1f}s."
                    )
        elif scene_type in ITEM_COUNT_SCENE_TYPES:
            items = scene.get("items", [])
            if isinstance(items, list) and len(items) > 0:
                min_duration = (len(items) * 2.5) + 1.5
                if duration > 0 and duration < min_duration:
                    warnings.append(
                        f"Scene {index}: {len(items)} items in {duration:.1f}s may feel rushed. "
                        f"Minimum recommended: {min_duration:.1f}s."
                    )
```

- [ ] **Step 3: Also update the timing recommendation** in the existing code. Replace the current check at line 320-323:

```python
        # Replace the old timing recommendation
        if not isinstance(scene.get("timing"), dict) and scene_type not in {"intro", "outro"}:
            recommendations.append(f"Scene {index}: add timing.tailHoldMs for intentional pacing")
```

Remove the old `leadInMs` recommendation at line 322-323.

- [ ] **Step 4: Write tests for the new rules**

Add to `packages/agent/tests/test_tools_validation.py`:

```python
    def test_legacy_timing_fields_warning(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "callout",
                    "text": "Hello",
                    "position": "center",
                    "durationInSeconds": 5,
                    "timing": {"leadInMs": 200, "audioStartMs": 150},
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("deprecated" in w.lower() for w in parsed["warnings"])

    def test_dead_air_detection_early_beat(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "custom",
                    "componentId": "bullet-slide",
                    "durationInSeconds": 10,
                    "props": {"title": "Test", "items": [{"text": "a"}]},
                    "beats": [{"id": "b1", "startMs": 50}],
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("before visuals are ready" in e for e in parsed["errors"])

    def test_beat_density_warning(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "intro",
                    "title": "Hello",
                    "durationInSeconds": 5,
                    "beats": [
                        {"id": "b1", "startMs": 200},
                        {"id": "b2", "startMs": 500},
                    ],
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("300ms apart" in w for w in parsed["warnings"])

    def test_tail_breathing_room_warning(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "intro",
                    "title": "Hello",
                    "durationInSeconds": 5,
                    "beats": [{"id": "b1", "startMs": 4900}],
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("rushed" in w.lower() for w in parsed["warnings"])

    def test_duration_content_density_warning(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "custom",
                    "componentId": "bullet-slide",
                    "durationInSeconds": 5,
                    "props": {
                        "title": "Test",
                        "items": [{"text": "a"}, {"text": "b"}, {"text": "c"}, {"text": "d"}],
                    },
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert any("rushed" in w.lower() for w in parsed["warnings"])

    def test_no_false_positives_on_valid_timing(self):
        from src.tools.validation import audit_content_quality

        config = {
            "scenes": [
                {
                    "type": "custom",
                    "componentId": "bullet-slide",
                    "durationInSeconds": 15,
                    "props": {
                        "title": "Test",
                        "items": [{"text": "a"}, {"text": "b"}],
                    },
                    "beats": [
                        {"id": "title", "startMs": 100},
                        {"id": "item1", "startMs": 2000},
                        {"id": "item2", "startMs": 4000},
                    ],
                }
            ],
        }
        parsed = json.loads(audit_content_quality(json.dumps(config)))
        assert not any("deprecated" in w.lower() for w in parsed["warnings"])
        assert not any("before visuals" in e for e in parsed["errors"])
        assert not any("rushed" in w.lower() for w in parsed["warnings"])
```

- [ ] **Step 5: Run the tests**

Run: `cd packages/agent && python -m pytest tests/test_tools_validation.py -v`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/agent/src/tools/validation.py packages/agent/tests/test_tools_validation.py
git commit -m "feat(validation): add 5 timing sync rules (dead air, beat density, tail, content density)"
```

---

## Phase 5: Integration Test

### Task 18: End-to-end visual verification

- [ ] **Step 1: Start Remotion Studio**

Run: `pnpm run dev`

- [ ] **Step 2: Open an existing config** with voiceover (e.g., one of the tutorial configs in `content/tutorials/`). Verify:

1. Every scene shows content within ~100ms of starting (no blank screens)
2. Voiceover starts AFTER visuals are ready
3. Items appear progressively (beat-driven or staggered)
4. Scene transitions feel smooth — no jarring cuts

- [ ] **Step 3: Run the full lint + typecheck**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 4: Run agent tests**

Run: `cd packages/agent && python -m pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 5: Commit any fixes from integration testing**

```bash
git commit -m "fix: integration test adjustments for Two-Phase timing"
```
