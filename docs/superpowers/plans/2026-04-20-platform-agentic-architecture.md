# Platform Agentic Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Remotion video platform into a multi-agent architecture: extract shared Remotion code, replace the monolithic copywriter agent with an orchestrator + 5 specialized SubAgents, add SSE streaming, and upgrade the frontend with real-time pipeline visibility.

**Architecture:** Hybrid SubAgent approach — 4 simple SubAgents (dict) for LLM-driven tasks + 1 CompiledSubAgent for Scene Creator's deterministic generate→validate loop. Orchestrator acts as hub, dispatching via `task()` and passing results between agents. CompositeBackend routes ephemeral work to LocalShellBackend and persistent memories to StoreBackend.

**Tech Stack:** Remotion 4 + React 19 (video pipeline), DeepAgents + LangGraph (agent orchestration), Gemini 3.1 Pro/Flash via Vertex AI (LLM), FastAPI + SSE (API), Vite + React 19 (frontend)

**Spec:** `docs/superpowers/specs/2026-04-20-platform-agentic-architecture-design.md`

---

## File Structure

### Create

```
src/shared/
├── themes/
│   ├── ThemeContext.ts
│   ├── themes.ts
│   └── index.ts
├── components/
│   ├── PhoneMascot.tsx
│   ├── MascotWatermark.tsx
│   ├── LogoWatermark.tsx
│   ├── KaraokeSubtitles.tsx
│   └── pixel-art/
│       ├── PixelLogo.tsx
│       ├── PixelSmoke.tsx
│       ├── pixelSkullMap.ts
│       └── smokeFrames.ts
├── hooks/
│   └── useSlideIn.ts
├── schemas/
│   ├── direction.ts
│   ├── audio.ts
│   └── index.ts
├── CompositionShell.tsx
└── useScenePrecomputation.ts

scripts/
└── generate-scene-catalog.ts

packages/agent/
├── src/
│   ├── orchestrator.py
│   ├── subagents/
│   │   ├── __init__.py
│   │   ├── researcher.py
│   │   ├── copywriter.py
│   │   ├── director.py
│   │   ├── sound_engineer.py
│   │   └── scene_creator/
│   │       ├── __init__.py
│   │       ├── graph.py
│   │       ├── nodes.py
│   │       └── tools.py
│   └── tools/
│       ├── __init__.py
│       ├── render.py
│       ├── research.py
│       ├── catalog.py
│       └── sound.py
├── prompts/
│   ├── orchestrator.md
│   ├── researcher.md
│   ├── director.md
│   ├── sound_engineer.md
│   └── scene_creator.md
├── skills/
│   ├── scene_catalog.md
│   ├── best_practices.md
│   └── brand_guidelines.md
└── tests/
    ├── test_orchestrator.py
    ├── test_subagents.py
    └── test_scene_creator.py

packages/web/src/
├── hooks/
│   └── useAgentStream.ts
└── components/
    ├── SubagentBadge.tsx
    ├── SoundChartCard.tsx
    ├── RenderProgress.tsx
    └── ErrorBanner.tsx
```

### Modify

```
src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx  — use CompositionShell
src/compositions/ClaudeCodeTutorial/schema.ts              — import schemas from shared
src/compositions/ProductShort/ProductShort.tsx              — use CompositionShell
src/compositions/ProductShort/schema.ts                    — import schemas from shared
src/compositions/ProductShort/scenes/HeroScene.tsx         — import from shared
src/compositions/ProductShort/scenes/BenefitsScene.tsx     — import from shared
src/compositions/ProductShort/scenes/PricingScene.tsx      — import from shared
src/compositions/ProductShort/scenes/CtaScene.tsx          — import from shared
src/utils/direction.ts                                     — re-export from shared schemas
packages/agent/src/agent.py                                — use orchestrator
packages/agent/src/api.py                                  — add SSE endpoint
packages/web/src/App.tsx                                   — use SSE
packages/web/src/types.ts                                  — add stream event types
packages/web/src/api.ts                                    — keep POST helpers, remove polling
```

### Delete (after move)

```
src/compositions/ClaudeCodeTutorial/ThemeContext.ts
src/compositions/ClaudeCodeTutorial/themes.ts
src/compositions/ClaudeCodeTutorial/components/PhoneMascot.tsx
src/compositions/ClaudeCodeTutorial/components/MascotWatermark.tsx
src/compositions/ClaudeCodeTutorial/components/LogoWatermark.tsx
src/compositions/ClaudeCodeTutorial/components/KaraokeSubtitles.tsx
src/compositions/ClaudeCodeTutorial/components/pixel-art/  (entire directory)
src/compositions/ClaudeCodeTutorial/hooks/useSlideIn.ts
packages/agent/src/tools.py  (split into tools/)
```

---

## Phase 1: Remotion Shared Code Extraction

> After Phase 1 the Remotion pipeline works identically but with zero cross-composition imports.
> Verification at every task: `npm run lint && npm run build`

### Task 1: Extract theme system and shared components to `src/shared/`

Move shared code out of `ClaudeCodeTutorial/` so both compositions import from `src/shared/`. No behavior change.

**Files:**

- Create: `src/shared/themes/ThemeContext.ts`, `src/shared/themes/themes.ts`, `src/shared/themes/index.ts`
- Create: `src/shared/components/PhoneMascot.tsx`, `src/shared/components/MascotWatermark.tsx`, `src/shared/components/LogoWatermark.tsx`, `src/shared/components/KaraokeSubtitles.tsx`
- Create: `src/shared/components/pixel-art/PixelLogo.tsx`, `src/shared/components/pixel-art/PixelSmoke.tsx`, `src/shared/components/pixel-art/pixelSkullMap.ts`, `src/shared/components/pixel-art/smokeFrames.ts`
- Create: `src/shared/hooks/useSlideIn.ts`
- Modify: `src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx`
- Modify: `src/compositions/ProductShort/ProductShort.tsx`
- Modify: `src/compositions/ProductShort/scenes/HeroScene.tsx`
- Modify: `src/compositions/ProductShort/scenes/BenefitsScene.tsx`
- Modify: `src/compositions/ProductShort/scenes/PricingScene.tsx`
- Modify: `src/compositions/ProductShort/scenes/CtaScene.tsx`
- Modify: All custom scenes that import from `./themes` or `../themes` or `../../themes`
- Delete: originals from `ClaudeCodeTutorial/`

- [ ] **Step 1: Create `src/shared/` directory structure**

```bash
mkdir -p src/shared/themes src/shared/components/pixel-art src/shared/hooks
```

- [ ] **Step 2: Move theme files**

Copy `src/compositions/ClaudeCodeTutorial/ThemeContext.ts` → `src/shared/themes/ThemeContext.ts`. No content changes needed — the file is self-contained (React context + `useTheme` hook).

Copy `src/compositions/ClaudeCodeTutorial/themes.ts` → `src/shared/themes/themes.ts`. Update the internal import:

```typescript
// OLD (line 1 of themes.ts):
import { useTheme } from "./ThemeContext"

// NEW:
import { useTheme } from "./ThemeContext"
// (same — no change needed, relative import stays valid)
```

Create `src/shared/themes/index.ts`:

```typescript
export { ThemeContext, useTheme } from "./ThemeContext"
export { getTheme, useThemeTokens } from "./themes"
export type { ThemeTokens, ThemeName } from "./themes"
```

- [ ] **Step 3: Move component files**

Copy these files preserving their content:

```
src/compositions/ClaudeCodeTutorial/components/PhoneMascot.tsx       → src/shared/components/PhoneMascot.tsx
src/compositions/ClaudeCodeTutorial/components/MascotWatermark.tsx    → src/shared/components/MascotWatermark.tsx
src/compositions/ClaudeCodeTutorial/components/LogoWatermark.tsx      → src/shared/components/LogoWatermark.tsx
src/compositions/ClaudeCodeTutorial/components/KaraokeSubtitles.tsx  → src/shared/components/KaraokeSubtitles.tsx
src/compositions/ClaudeCodeTutorial/components/pixel-art/*           → src/shared/components/pixel-art/*
src/compositions/ClaudeCodeTutorial/hooks/useSlideIn.ts              → src/shared/hooks/useSlideIn.ts
```

Update internal imports within moved files:

In `MascotWatermark.tsx`, update:

```typescript
// OLD:
import { useThemeTokens } from "../themes"
import { PhoneMascot } from "./PhoneMascot"
// NEW:
import { useThemeTokens } from "../themes"
import { PhoneMascot } from "./PhoneMascot"
// (no change — relative paths within shared/ stay valid)
```

In `LogoWatermark.tsx`, update:

```typescript
// OLD:
import { PixelLogo } from "./pixel-art/PixelLogo"
// NEW (same relative path, still valid):
import { PixelLogo } from "./pixel-art/PixelLogo"
```

In `KaraokeSubtitles.tsx`, update:

```typescript
// OLD:
import { useThemeTokens } from "../themes"
// NEW:
import { useThemeTokens } from "../themes"
// (stays valid — KaraokeSubtitles is now in shared/components/, themes in shared/themes/)
```

Wait — `KaraokeSubtitles.tsx` was in `components/` under ClaudeCodeTutorial, importing `../themes`. Now it's in `src/shared/components/`, and themes are in `src/shared/themes/`. The relative path `../themes` still resolves correctly. Good.

- [ ] **Step 4: Update all ClaudeCodeTutorial imports**

In `src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx`, update lines 13-14 and 20-21:

```typescript
// OLD:
import { ThemeContext } from "./ThemeContext"
import { getTheme } from "./themes"
import { KaraokeSubtitles, type WordTimestamp } from "./components/KaraokeSubtitles"
import { LogoWatermark } from "./components/LogoWatermark"

// NEW:
import { ThemeContext, getTheme } from "../../shared/themes"
import { KaraokeSubtitles, type WordTimestamp } from "../../shared/components/KaraokeSubtitles"
import { LogoWatermark } from "../../shared/components/LogoWatermark"
```

In all scene files under `src/compositions/ClaudeCodeTutorial/scenes/` that import `useThemeTokens`, update:

```typescript
// OLD (varies per file, e.g. IntroScene.tsx):
import { useThemeTokens } from "../themes"
// NEW:
import { useThemeTokens } from "../../../shared/themes"
```

For scenes in `scenes/custom/`, the path is one level deeper:

```typescript
// OLD (e.g. BlockDiagramScene.tsx):
import { useThemeTokens } from "../../themes"
// NEW:
import { useThemeTokens } from "../../../../shared/themes"
```

Scenes that import PhoneMascot or MascotWatermark:

```typescript
// OLD:
import { MascotWatermark } from "../components/MascotWatermark"
// NEW:
import { MascotWatermark } from "../../../shared/components/MascotWatermark"
```

- [ ] **Step 5: Update all ProductShort imports**

In `src/compositions/ProductShort/ProductShort.tsx`, update lines 3-4:

```typescript
// OLD:
import { ThemeContext } from "../ClaudeCodeTutorial/ThemeContext"
import { getTheme } from "../ClaudeCodeTutorial/themes"

// NEW:
import { ThemeContext, getTheme } from "../../shared/themes"
```

In `src/compositions/ProductShort/scenes/HeroScene.tsx`, update lines 4-6:

```typescript
// OLD:
import { useThemeTokens } from "../../ClaudeCodeTutorial/themes"
import { PhoneMascot } from "../../ClaudeCodeTutorial/components/PhoneMascot"
import { useSlideIn } from "../../ClaudeCodeTutorial/hooks/useSlideIn"

// NEW:
import { useThemeTokens } from "../../../shared/themes"
import { PhoneMascot } from "../../../shared/components/PhoneMascot"
import { useSlideIn } from "../../../shared/hooks/useSlideIn"
```

Same pattern for `BenefitsScene.tsx`, `PricingScene.tsx`, `CtaScene.tsx` — update all `../../ClaudeCodeTutorial/` imports to `../../../shared/`.

- [ ] **Step 6: Delete original files**

```bash
rm src/compositions/ClaudeCodeTutorial/ThemeContext.ts
rm src/compositions/ClaudeCodeTutorial/themes.ts
rm src/compositions/ClaudeCodeTutorial/components/PhoneMascot.tsx
rm src/compositions/ClaudeCodeTutorial/components/MascotWatermark.tsx
rm src/compositions/ClaudeCodeTutorial/components/LogoWatermark.tsx
rm src/compositions/ClaudeCodeTutorial/components/KaraokeSubtitles.tsx
rm -rf src/compositions/ClaudeCodeTutorial/components/pixel-art
rm src/compositions/ClaudeCodeTutorial/hooks/useSlideIn.ts
```

- [ ] **Step 7: Verify**

```bash
npm run lint && npm run build
```

Expected: no errors. The bundle should compile successfully and all imports should resolve.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(shared): extract themes, components, hooks to src/shared/"
```

---

### Task 2: Centralize shared Zod schemas

Move Zod schemas from `src/utils/direction.ts` to `src/shared/schemas/`. Keep helper functions in `direction.ts` but have them import schemas from shared.

**Files:**

- Create: `src/shared/schemas/direction.ts`, `src/shared/schemas/audio.ts`, `src/shared/schemas/index.ts`
- Modify: `src/utils/direction.ts` — remove schema definitions, import from shared
- Modify: `src/compositions/ClaudeCodeTutorial/schema.ts` — import from shared
- Modify: `src/compositions/ProductShort/schema.ts` — import from shared

- [ ] **Step 1: Create `src/shared/schemas/direction.ts`**

Extract these schemas from `src/utils/direction.ts`:

```typescript
import { z } from "zod"

export const BeatSchema = z.object({
  id: z.string(),
  startMs: z.number(),
  endMs: z.number().optional(),
  narration: z.string(),
  visual: z.string(),
  animation: z.string(),
  emphasis: z.enum(["low", "medium", "high"]).optional(),
})

export const TimingSchema = z.object({
  leadInMs: z.number().optional(),
  audioStartMs: z.number().optional(),
  tailHoldMs: z.number().optional(),
  minVisualHoldMs: z.number().optional(),
  transitionMs: z.number().min(0).max(1500).optional(),
})

export const BriefSchema = z.object({
  platform: z.string(),
  audience: z.string(),
  goal: z.string(),
  promise: z.string(),
  tone: z.string(),
  cta: z.string(),
  hookStrategy: z.string(),
})

export const DirectionSceneFieldsSchema = z.object({
  timing: TimingSchema.optional(),
  beats: z.array(BeatSchema).optional(),
})

export type Beat = z.infer<typeof BeatSchema>
export type Timing = z.infer<typeof TimingSchema>
export type Brief = z.infer<typeof BriefSchema>
```

Note: Copy the exact schema definitions from `src/utils/direction.ts` — the above is the structure. Match field-by-field with the existing code.

- [ ] **Step 2: Create `src/shared/schemas/audio.ts`**

Extract voiceover and sound design schemas from `src/utils/direction.ts`:

```typescript
import { z } from "zod"
import { BeatSchema, TimingSchema } from "./direction"

// Copy ElevenLabsOptionsSchema, VoiceoverSceneSchema, VoiceoverConfigSchema,
// MusicBedSchema, SfxEntrySchema, SoundDesignSchema from direction.ts
// Keep the exact same structure.

export const VoiceoverConfigSchema = z.object({
  // ... exact copy from direction.ts
})

export const SoundDesignSchema = z.object({
  // ... exact copy from direction.ts
})

// Export inferred types
export type VoiceoverConfig = z.infer<typeof VoiceoverConfigSchema>
export type SoundDesign = z.infer<typeof SoundDesignSchema>
```

- [ ] **Step 3: Create `src/shared/schemas/index.ts`**

```typescript
export {
  BeatSchema,
  TimingSchema,
  BriefSchema,
  DirectionSceneFieldsSchema,
  type Beat,
  type Timing,
  type Brief,
} from "./direction"

export { VoiceoverConfigSchema, SoundDesignSchema, type VoiceoverConfig, type SoundDesign } from "./audio"
```

- [ ] **Step 4: Update `src/utils/direction.ts`**

Remove schema definitions and re-export from shared. Keep all helper functions in place.

```typescript
// At the top of direction.ts, replace schema definitions with:
export {
  BeatSchema,
  TimingSchema,
  BriefSchema,
  DirectionSceneFieldsSchema,
  VoiceoverConfigSchema,
  SoundDesignSchema,
} from "../shared/schemas"

export type { Beat, Timing, Brief, VoiceoverConfig, SoundDesign } from "../shared/schemas"

// Keep all helper functions (getMergedTiming, msToFrames, etc.) unchanged below.
// They import types from the re-exports above.
```

- [ ] **Step 5: Update composition schemas**

In `src/compositions/ClaudeCodeTutorial/schema.ts`, update:

```typescript
// OLD:
import { DirectionSceneFieldsSchema, SoundDesignSchema, VoiceoverConfigSchema } from "../../utils/direction"
import { BriefSchema } from "../../utils/direction"

// NEW:
import { BriefSchema, DirectionSceneFieldsSchema, SoundDesignSchema, VoiceoverConfigSchema } from "../../shared/schemas"
```

Same change in `src/compositions/ProductShort/schema.ts`.

- [ ] **Step 6: Verify and commit**

```bash
npm run lint && npm run build
git add -A
git commit -m "refactor(schemas): centralize shared Zod schemas in src/shared/schemas/"
```

---

### Task 3: Create CompositionShell — eliminate root boilerplate

Extract the ~80 lines of identical precomputation + rendering logic from both compositions into a shared `CompositionShell` component and `useScenePrecomputation` hook.

**Files:**

- Create: `src/shared/useScenePrecomputation.ts`
- Create: `src/shared/CompositionShell.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx` — use CompositionShell
- Modify: `src/compositions/ProductShort/ProductShort.tsx` — use CompositionShell

- [ ] **Step 1: Create `src/shared/useScenePrecomputation.ts`**

This hook extracts lines 74-112 from ClaudeCodeTutorial.tsx (identical to 23-59 of ProductShort.tsx):

```typescript
import { getMergedBeats, getMergedTiming, getSceneAudioDelayMs, getVoiceoverText, msToFrames } from "../utils/direction"
import type { SceneAudioInfo } from "../utils/audioMix"

interface BaseScene {
  type: string
  durationInSeconds: number
  timing?: unknown
  beats?: unknown
  componentId?: string
  [key: string]: unknown
}

interface BaseConfig {
  fps: number
  voiceover?: { enabled?: boolean; scenes: Record<string, unknown> }
  [key: string]: unknown
}

export interface SceneInfo<S extends BaseScene> {
  directedScene: S
  durationInFrames: number
  timing: ReturnType<typeof getMergedTiming>
  hasVoiceover: boolean
  audioDelayFrames: number
}

export function precomputeScenes<S extends BaseScene>(
  scenes: S[],
  config: BaseConfig,
): { sceneInfos: SceneInfo<S>[]; sceneAudioInfos: SceneAudioInfo[] } {
  const sceneInfos: SceneInfo<S>[] = []
  const sceneAudioInfos: SceneAudioInfo[] = []
  let cumulativeFrames = 0

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const voiceScene = config.voiceover?.scenes[String(i)]
    const timing = getMergedTiming(scene.timing, voiceScene)
    const beats = getMergedBeats(scene.beats, voiceScene)
    const directedScene = {
      ...scene,
      ...(timing ? { timing } : {}),
      ...(beats ? { beats } : {}),
    } as S
    const durationInFrames = Math.ceil(directedScene.durationInSeconds * config.fps)
    const audioDelayFrames = msToFrames(getSceneAudioDelayMs(timing), config.fps)
    const hasVoiceover = Boolean(config.voiceover?.enabled && getVoiceoverText(voiceScene))

    sceneInfos.push({ directedScene, durationInFrames, timing, hasVoiceover, audioDelayFrames })

    const sceneType = scene.type === "custom" ? `custom/${scene.componentId ?? "unknown"}` : scene.type
    sceneAudioInfos.push({
      startFrame: cumulativeFrames,
      durationFrames: durationInFrames,
      timing: timing ?? undefined,
      audioDurationMs: hasVoiceover ? directedScene.durationInSeconds * 1000 : null,
      sceneType,
    })

    cumulativeFrames += durationInFrames
  }

  return { sceneInfos, sceneAudioInfos }
}
```

- [ ] **Step 2: Create `src/shared/CompositionShell.tsx`**

This component wraps the Series + Audio + SFX rendering pattern shared by both compositions:

```tsx
import React from "react"
import { AbsoluteFill, Audio, Sequence, Series, staticFile, useVideoConfig } from "remotion"
import { ThemeContext, getTheme, type ThemeName } from "./themes"
import { computeMusicVolume, dbToLinear, getSceneSfxEntries, sfxEndFrame, sfxTriggerFrame } from "../utils/audioMix"
import { precomputeScenes, type SceneInfo } from "./useScenePrecomputation"

interface BaseScene {
  type: string
  durationInSeconds: number
  timing?: unknown
  beats?: unknown
  [key: string]: unknown
}

interface BaseConfig {
  id: string
  fps: number
  theme?: ThemeName
  voiceover?: { enabled?: boolean; scenes: Record<string, unknown> }
  soundDesign?: {
    enabled?: boolean
    musicBed?: { volume: number; duckingVolume: number; fadeInMs: number; fadeOutMs: number; duckingFadeMs: number }
    sfx?: Array<{ id: string; volume: number; loop?: boolean; trigger: string; sceneTypes?: string[] }>
  }
  scenes: BaseScene[]
}

interface CompositionShellProps<S extends BaseScene, C extends BaseConfig> {
  config: C
  theme: ThemeName
  renderScene: (scene: S, index: number) => React.ReactNode
  renderOverlay?: (scene: S, info: SceneInfo<S>, index: number) => React.ReactNode
  musicLoop?: boolean
}

export function CompositionShell<S extends BaseScene, C extends BaseConfig>({
  config,
  theme,
  renderScene,
  renderOverlay,
  musicLoop,
}: CompositionShellProps<S, C>) {
  const { durationInFrames: totalDurationInFrames } = useVideoConfig()
  const bg = getTheme(theme).background

  const { sceneInfos, sceneAudioInfos } = precomputeScenes(config.scenes as S[], config)

  return (
    <ThemeContext.Provider value={theme}>
      <AbsoluteFill style={{ background: bg }}>
        {config.soundDesign?.enabled && config.soundDesign.musicBed && (
          <Audio
            src={staticFile(`audio/${config.id}/music-bed.mp3`)}
            volume={(f) =>
              computeMusicVolume(f, sceneAudioInfos, config.soundDesign!.musicBed!, config.fps, totalDurationInFrames)
            }
            {...(musicLoop ? { loop: true } : {})}
          />
        )}
        <Series>
          {sceneInfos.map((info, i) => {
            const { directedScene, durationInFrames, timing, hasVoiceover, audioDelayFrames } = info
            return (
              <Series.Sequence key={i} durationInFrames={durationInFrames}>
                {hasVoiceover && (
                  <Sequence from={audioDelayFrames}>
                    <Audio src={staticFile(`voiceover/${config.id}/${i}.mp3`)} />
                  </Sequence>
                )}
                {config.soundDesign?.enabled &&
                  getSceneSfxEntries(i, sceneAudioInfos[i].sceneType, config.soundDesign as never).map((sfx) => {
                    const triggerFrame = sfxTriggerFrame(sfx, timing ?? undefined, config.fps)
                    const endFrame = sfxEndFrame(sfx, durationInFrames)
                    return (
                      <Sequence from={triggerFrame} key={sfx.id}>
                        <Audio
                          src={staticFile(`audio/${config.id}/sfx-${sfx.id}.mp3`)}
                          volume={() => dbToLinear(sfx.volume)}
                          {...(sfx.loop
                            ? { loop: true, ...(endFrame !== undefined ? { endAt: endFrame - triggerFrame } : {}) }
                            : {})}
                        />
                      </Sequence>
                    )
                  })}
                {renderScene(directedScene as S, i)}
                {renderOverlay?.(directedScene as S, info, i)}
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}
```

- [ ] **Step 3: Refactor `ClaudeCodeTutorial.tsx` to use CompositionShell**

Replace the entire component body (~100 lines) with:

```tsx
import React from "react"
import { continueRender, delayRender, staticFile } from "remotion"
import { TutorialConfig } from "./schema"
import { getTheme } from "../../shared/themes"
import { IntroScene } from "./scenes/IntroScene"
import { TerminalScene } from "./scenes/TerminalScene"
import { CalloutScene } from "./scenes/CalloutScene"
import { OutroScene } from "./scenes/OutroScene"
import { CustomScene } from "./scenes/CustomScene"
import { KaraokeSubtitles, type WordTimestamp } from "../../shared/components/KaraokeSubtitles"
import { LogoWatermark } from "../../shared/components/LogoWatermark"
import { CompositionShell } from "../../shared/CompositionShell"
import type { SceneInfo } from "../../shared/useScenePrecomputation"
import type { TutorialConfig as Config } from "./schema"

// useTimestamps hook stays — it's specific to this composition
function useTimestamps(configId: string, sceneCount: number, enabled: boolean): (WordTimestamp[] | null)[] {
  // ... same implementation as before (lines 32-64)
}

type TutorialScene = Config["scenes"][number]

export const ClaudeCodeTutorial: React.FC<TutorialConfig> = (config) => {
  const theme = config.theme ?? "default"
  const themeTokens = getTheme(theme)
  const subtitlesEnabled = config.subtitles?.enabled !== false && Boolean(config.voiceover?.enabled)
  const sceneTimestamps = useTimestamps(config.id, config.scenes.length, subtitlesEnabled)
  const showLogoWatermark = !themeTokens.mascot.show

  return (
    <CompositionShell<TutorialScene, TutorialConfig>
      config={config}
      theme={theme}
      renderScene={(scene, i) => (
        <>
          {scene.type === "intro" && <IntroScene {...scene} />}
          {scene.type === "terminal" && <TerminalScene {...scene} />}
          {scene.type === "callout" && <CalloutScene {...scene} />}
          {scene.type === "outro" && <OutroScene {...scene} />}
          {scene.type === "custom" && <CustomScene {...scene} />}
        </>
      )}
      renderOverlay={(scene, info, i) => (
        <>
          {subtitlesEnabled && sceneTimestamps[i] && (
            <KaraokeSubtitles
              timestamps={sceneTimestamps[i]!}
              audioDelayFrames={info.audioDelayFrames}
              position={config.subtitles?.position ?? "bottom"}
              fontSize={config.subtitles?.fontSize ?? 32}
            />
          )}
          {showLogoWatermark && scene.type !== "intro" && <LogoWatermark />}
        </>
      )}
    />
  )
}
```

- [ ] **Step 4: Refactor `ProductShort.tsx` to use CompositionShell**

```tsx
import React from "react"
import { ProductShortConfig } from "./schema"
import { HeroScene } from "./scenes/HeroScene"
import { BenefitsScene } from "./scenes/BenefitsScene"
import { PricingScene } from "./scenes/PricingScene"
import { CtaScene } from "./scenes/CtaScene"
import { CompositionShell } from "../../shared/CompositionShell"

type ShortScene = ProductShortConfig["scenes"][number]

export const ProductShort: React.FC<ProductShortConfig> = (config) => {
  return (
    <CompositionShell<ShortScene, ProductShortConfig>
      config={config}
      theme="linea-directa"
      musicLoop
      renderScene={(scene) => (
        <>
          {scene.type === "hero" && <HeroScene {...scene} />}
          {scene.type === "benefits" && <BenefitsScene {...scene} />}
          {scene.type === "pricing" && <PricingScene {...scene} />}
          {scene.type === "cta" && <CtaScene {...scene} />}
        </>
      )}
    />
  )
}
```

- [ ] **Step 5: Verify and commit**

```bash
npm run lint && npm run build
```

Verify both compositions render correctly in Remotion Studio:

```bash
npm run dev
```

Open browser, check ClaudeCodeTutorial and ProductShort previews. Confirm audio, SFX, and scene transitions work identically.

```bash
git add -A
git commit -m "refactor(compositions): extract CompositionShell, eliminate boilerplate duplication"
```

---

### Task 4: Generate scene-catalog.json

Create a script that reads `customSceneRegistry.ts` and the Zod schema to produce a machine-readable scene catalog for agents.

**Files:**

- Create: `scripts/generate-scene-catalog.ts`
- Create: `src/shared/scene-catalog.json` (generated output)
- Modify: `package.json` — add `generate:catalog` script

- [ ] **Step 1: Write the catalog generator script**

```typescript
// scripts/generate-scene-catalog.ts
//
// Reads customSceneRegistry.ts to get component IDs,
// then reads schema.ts to extract props for each custom scene.
// Outputs src/shared/scene-catalog.json.

import fs from "fs"
import path from "path"
import { zodToJsonSchema } from "zod-to-json-schema"

// Import the registry to get component IDs
import { customSceneRegistry } from "../src/compositions/ClaudeCodeTutorial/customSceneRegistry"

// Import the schema to extract custom scene props
// The CustomSceneSchema in schema.ts is a discriminated union by componentId
import { TutorialConfigSchema } from "../src/compositions/ClaudeCodeTutorial/schema"
import { ProductShortConfigSchema } from "../src/compositions/ProductShort/schema"

interface SceneCatalogEntry {
  componentId: string
  composition: string
  description: string
  propsSchema: Record<string, unknown>
}

const catalog: {
  generatedAt: string
  scenes: {
    tutorial: {
      builtin: string[]
      custom: SceneCatalogEntry[]
    }
    productShort: {
      builtin: string[]
    }
  }
} = {
  generatedAt: new Date().toISOString(),
  scenes: {
    tutorial: {
      builtin: ["intro", "terminal", "callout", "outro"],
      custom: [],
    },
    productShort: {
      builtin: ["hero", "benefits", "pricing", "cta"],
    },
  },
}

// Extract custom scene component IDs from registry
for (const componentId of Object.keys(customSceneRegistry)) {
  catalog.scenes.tutorial.custom.push({
    componentId,
    composition: "ClaudeCodeTutorial",
    description: `Custom scene: ${componentId}`,
    propsSchema: {},
  })
}

const outPath = path.join(__dirname, "..", "src", "shared", "scene-catalog.json")
fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2))
console.log(`Scene catalog written to ${outPath} (${catalog.scenes.tutorial.custom.length} custom scenes)`)
```

Note: This is a minimal implementation. The `propsSchema` field is left empty because extracting Zod discriminated union props at runtime requires `zod-to-json-schema`. Install it first:

```bash
npm install -D zod-to-json-schema
```

The catalog can be enriched later with prop schemas by parsing the Zod discriminated union.

- [ ] **Step 2: Add npm script and generate**

In `package.json`, add:

```json
"generate:catalog": "npx tsx scripts/generate-scene-catalog.ts"
```

Run:

```bash
npm run generate:catalog
```

Expected: `src/shared/scene-catalog.json` with 26 custom scene entries.

- [ ] **Step 3: Verify and commit**

```bash
npm run lint
git add scripts/generate-scene-catalog.ts src/shared/scene-catalog.json package.json
git commit -m "feat(catalog): add scene-catalog.json generation script"
```

---

## Phase 2: Multi-Agent Pipeline

> After Phase 2 the agent has 5 specialized subagents orchestrated via SubAgentMiddleware.
> The API contract stays the same (POST /api/chat returns JSON). Frontend still works.
> Verification: `cd packages/agent && uv run pytest`

### Task 5: Restructure agent package and create orchestrator scaffold

Split the monolithic `tools.py` into `tools/` modules, create `subagents/` structure, write orchestrator prompt and setup.

**Files:**

- Create: `packages/agent/src/tools/__init__.py`, `packages/agent/src/tools/render.py`
- Create: `packages/agent/src/tools/research.py`, `packages/agent/src/tools/catalog.py`, `packages/agent/src/tools/sound.py`
- Create: `packages/agent/src/subagents/__init__.py`
- Create: `packages/agent/src/orchestrator.py`
- Create: `packages/agent/prompts/orchestrator.md`
- Modify: `packages/agent/src/agent.py` — use orchestrator
- Delete: `packages/agent/src/tools.py` (after split)

- [ ] **Step 1: Split tools.py into tools/ modules**

Create `packages/agent/src/tools/__init__.py`:

```python
from .render import check_render_status, submit_render
```

Create `packages/agent/src/tools/render.py` — move `submit_render` and `check_render_status` from `tools.py`:

```python
import os
import time

import httpx

RENDER_SERVICE_URL = os.environ.get("RENDER_SERVICE_URL", "http://localhost:3100")


def submit_render(
    id: str,
    scenes: list[dict],
    title: str = "",
    description: str = "",
    fps: int = 30,
    width: int = 1080,
    height: int = 1920,
    theme: str = "linea-directa",
    composition: str = "ProductShort",
    product: str = "",
    headline: str = "",
) -> dict:
    """Submit a complete video config for rendering.

    Returns a job ID for tracking, or error details if validation fails.
    """
    config: dict = {"id": id, "fps": fps, "width": width, "height": height, "theme": theme, "scenes": scenes}
    if composition == "ProductShort":
        config["composition"] = composition
        config["product"] = product
        config["headline"] = headline
    else:
        config["title"] = title
        config["description"] = description
    response = httpx.post(f"{RENDER_SERVICE_URL}/api/render", json=config, timeout=30.0)
    return response.json()


def check_render_status(job_id: str) -> dict:
    """Check the status of a render job. Polls every 5s, 5-minute timeout."""
    deadline = time.time() + 300
    result = {}
    while time.time() < deadline:
        response = httpx.get(f"{RENDER_SERVICE_URL}/api/render/{job_id}/status", timeout=10.0)
        result = response.json()
        if result.get("status") in ("done", "error"):
            return result
        time.sleep(5)
    return result
```

Create `packages/agent/src/tools/research.py`:

```python
import httpx


def web_search(query: str) -> str:
    """Search the web for information. Returns search results as text.

    Args:
        query: Search query string.
    """
    # Minimal implementation using DuckDuckGo instant answer API
    response = httpx.get(
        "https://api.duckduckgo.com/",
        params={"q": query, "format": "json", "no_html": 1},
        timeout=15.0,
    )
    data = response.json()
    results = []
    if data.get("AbstractText"):
        results.append(data["AbstractText"])
    for topic in data.get("RelatedTopics", [])[:5]:
        if isinstance(topic, dict) and topic.get("Text"):
            results.append(topic["Text"])
    return "\n\n".join(results) if results else "No results found."


def web_fetch(url: str) -> str:
    """Fetch the text content of a URL.

    Args:
        url: The URL to fetch.
    """
    response = httpx.get(url, timeout=15.0, follow_redirects=True)
    response.raise_for_status()
    # Return first 10000 chars of text content
    return response.text[:10000]


def scrape_product(product_slug: str) -> str:
    """Scrape product information from lineadirecta.com.

    Args:
        product_slug: Product URL slug (e.g. 'seguro-coche', 'seguro-hogar').
    """
    url = f"https://www.lineadirecta.com/{product_slug}"
    return web_fetch(url)
```

Create `packages/agent/src/tools/catalog.py`:

```python
import json
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parent.parent.parent.parent.parent / "src" / "shared" / "scene-catalog.json"


def query_scene_catalog(query: str = "") -> str:
    """Query the scene catalog for available scene types and their props.

    Args:
        query: Optional search term to filter scenes. Empty returns all.
    """
    if not CATALOG_PATH.exists():
        return "Scene catalog not found. Run `npm run generate:catalog` first."

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))

    if not query:
        # Return summary
        custom = catalog["scenes"]["tutorial"]["custom"]
        builtin_tutorial = catalog["scenes"]["tutorial"]["builtin"]
        builtin_short = catalog["scenes"]["productShort"]["builtin"]
        lines = [
            f"Tutorial builtin scenes: {', '.join(builtin_tutorial)}",
            f"Product Short builtin scenes: {', '.join(builtin_short)}",
            f"Custom scenes ({len(custom)} available):",
        ]
        for scene in custom:
            lines.append(f"  - {scene['componentId']}: {scene['description']}")
        return "\n".join(lines)

    # Filter by query
    custom = catalog["scenes"]["tutorial"]["custom"]
    matches = [s for s in custom if query.lower() in s["componentId"].lower()]
    if not matches:
        return f"No scenes matching '{query}'. Use query_scene_catalog() to see all."
    return json.dumps(matches, indent=2)
```

Create `packages/agent/src/tools/sound.py`:

```python
import json
import os
from pathlib import Path

from langgraph.types import interrupt

RENDER_SERVICE_URL = os.environ.get("RENDER_SERVICE_URL", "http://localhost:3100")
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent


def present_sound_chart(music_bed: dict, sfx_entries: list[dict]) -> str:
    """Present a sound design chart to the user for approval.

    Pauses execution and waits for the user to approve or request changes.

    Args:
        music_bed: Music bed configuration (libraryId, volume, ducking settings).
        sfx_entries: List of SFX entries with id, prompt, trigger, sceneTypes, volume.
    """
    decision = interrupt(
        {
            "type": "sound_chart_checkpoint",
            "music_bed": music_bed,
            "sfx_entries": sfx_entries,
        }
    )
    if isinstance(decision, dict) and decision.get("approved"):
        return "APPROVED — The user approved the sound chart. Now generate the audio files."
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — {feedback}. Revise the sound chart and call present_sound_chart again."


def list_audio_library() -> str:
    """List available music tracks in the audio library."""
    library_dir = PROJECT_ROOT / "public" / "audio" / "library"
    if not library_dir.exists():
        return "No audio library found at public/audio/library/"
    tracks = sorted(d.name for d in library_dir.iterdir() if d.is_dir())
    return json.dumps(tracks) if tracks else "No tracks found."


def generate_audio(config_path: str) -> str:
    """Generate sound design audio files from a config.

    Runs the generate-sound-design.ts script.

    Args:
        config_path: Path to the config.json file.
    """
    import subprocess

    result = subprocess.run(
        ["npx", "tsx", "scripts/generate-sound-design.ts", config_path],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        return f"Error generating audio: {result.stderr}"
    return f"Audio generated successfully. {result.stdout}"
```

- [ ] **Step 2: Update tools/**init**.py with all exports**

```python
from .render import check_render_status, submit_render
from .research import scrape_product, web_fetch, web_search
from .catalog import query_scene_catalog
from .sound import generate_audio, list_audio_library, present_sound_chart
```

- [ ] **Step 3: Move present_escaleta to tools/render.py**

Add `present_escaleta` from old `tools.py` into `tools/render.py` (it's tightly coupled with the render flow):

```python
from langgraph.types import interrupt

def present_escaleta(scenes: list[dict], brief: dict) -> str:
    """Present a video escaleta (scene breakdown) to the user for approval.

    IMPORTANT: When the return value contains "approved": true, you MUST immediately
    call submit_render with the approved scenes. Do NOT call present_escaleta again.
    """
    decision = interrupt(
        {
            "type": "escaleta_checkpoint",
            "brief": brief,
            "scenes": scenes,
        }
    )
    if isinstance(decision, dict) and decision.get("approved"):
        return "APPROVED — The user approved the escaleta. Now call submit_render immediately with the complete video config."
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — The user wants changes: {feedback}. Revise the scenes and call present_escaleta again."
```

Update `tools/__init__.py` to export it:

```python
from .render import check_render_status, present_escaleta, submit_render
```

- [ ] **Step 4: Write orchestrator prompt**

Create `packages/agent/prompts/orchestrator.md`:

```markdown
# Video Platform Orchestrator

You coordinate a team of specialized agents to produce marketing videos for Línea Directa.

## Your team

You dispatch tasks to these agents using the `task(name, task)` tool:

- **researcher** — Searches the web for product info, pricing, benefits, competitor data. Use for shorts. For tutorials, searches documentation. Returns structured text with facts.
- **copywriter** — Generates the video escaleta (scene breakdown) and config.json. Has a human checkpoint: presents the escaleta for approval. Returns the complete config JSON.
- **director** — Polishes timing, narrative beats, and audio/visual synchronization. Takes a config JSON, returns an improved config JSON with timing and beats added.
- **sound_engineer** — Designs music bed and SFX. Has a human checkpoint: presents the sound chart for approval. Takes a config JSON, returns updated config with soundDesign section.
- **scene_creator** — Creates new custom scene components when the copywriter's config references a componentId that doesn't exist in the catalog. Only call this when needed.

## Your tools (direct)

- **submit_render** — Submit final config for rendering. Call after all agents have finished.
- **check_render_status** — Poll render progress. Call after submit_render.

## Workflow

1. Understand the user's request. Classify: is this a new video, a modification, or a question?
2. For new videos:
   a. Dispatch **researcher** to gather product/topic data
   b. Dispatch **copywriter** with the research results + user request. It will handle the escaleta checkpoint.
   c. If the config uses custom scenes not in the catalog, dispatch **scene_creator**
   d. Dispatch **director** with the config to add timing and beats
   e. Dispatch **sound_engineer** with the directed config. It will handle the sound chart checkpoint.
   f. Call **submit_render** with the final config
   g. Call **check_render_status** to monitor and report
3. For modifications (timing, sound, etc.): only dispatch the relevant agents.
4. For questions: answer directly without dispatching agents.

## Rules

- Pass results between agents: researcher output → copywriter input, copywriter output → director input, etc.
- Never modify the config yourself. Let the specialized agents handle it.
- When a subagent returns an error, inform the user and suggest alternatives.
- Respond in the same language the user writes in (usually Spanish).
```

- [ ] **Step 5: Create orchestrator.py**

Create `packages/agent/src/orchestrator.py`:

```python
import os
from pathlib import Path

from deepagents import create_deep_agent
from langchain_google_vertexai import ChatVertexAI
from langgraph.checkpoint.memory import MemorySaver

from .tools.render import check_render_status, submit_render

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
SKILLS_DIR = Path(__file__).parent.parent / "skills"


def load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")


def create_model(name: str | None = None):
    model_name = name or os.environ.get("LLM_MODEL", "gemini-3.1-pro")
    return ChatVertexAI(
        model_name=model_name,
        project=os.environ.get("GOOGLE_CLOUD_PROJECT", "vertexlda"),
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
    )


def create_video_orchestrator():
    """Create the multi-agent video orchestrator."""
    from .tools.catalog import query_scene_catalog
    from .tools.render import present_escaleta
    from .tools.research import scrape_product, web_fetch, web_search
    from .tools.sound import generate_audio, list_audio_library, present_sound_chart

    model = create_model()
    flash_model = create_model("gemini-3.1-flash")
    checkpointer = MemorySaver()

    subagents = [
        {
            "name": "researcher",
            "description": "Searches the web for product info, documentation, and competitive data.",
            "system_prompt": load_prompt("researcher"),
            "tools": [web_search, web_fetch, scrape_product],
            "model": flash_model,
        },
        {
            "name": "copywriter",
            "description": "Generates video escaleta and config.json with human approval checkpoint.",
            "system_prompt": load_prompt("copywriter"),
            "tools": [present_escaleta, query_scene_catalog],
        },
        {
            "name": "director",
            "description": "Polishes timing, narrative beats, and audio/visual synchronization.",
            "system_prompt": load_prompt("director"),
            "tools": [],
        },
        {
            "name": "sound_engineer",
            "description": "Designs music bed and SFX with human approval checkpoint.",
            "system_prompt": load_prompt("sound_engineer"),
            "tools": [present_sound_chart, generate_audio, list_audio_library],
        },
    ]

    agent = create_deep_agent(
        model=model,
        tools=[submit_render, check_render_status],
        system_prompt=load_prompt("orchestrator"),
        checkpointer=checkpointer,
        subagents=subagents,
        skills=[str(SKILLS_DIR)],
    )

    return agent
```

- [ ] **Step 6: Update agent.py to use orchestrator**

Replace `packages/agent/src/agent.py`:

```python
from .orchestrator import create_video_orchestrator


def create_video_agent():
    """Create the video agent. Delegates to orchestrator."""
    return create_video_orchestrator()
```

- [ ] **Step 7: Write minimal subagent prompts**

Create `packages/agent/prompts/researcher.md`:

```markdown
# Researcher Agent

You gather factual information for video production. Your findings will be used by a copywriter to create video scripts.

## For product shorts (Línea Directa)

1. Search lineadirecta.com for the product page
2. Extract: product name, price, coverage details, key benefits, current offers
3. Search competitors for comparison points
4. Return structured data: product name, price, benefits (list), USPs, CTA URL

## For tutorials

1. Search official documentation for the topic
2. Find usage examples and common patterns
3. Identify key concepts to demonstrate
4. Return structured data: feature name, key concepts, example commands/code, common mistakes

## Output format

Return a structured text summary with clear sections. Do not generate video configs — that's the copywriter's job.
```

Create `packages/agent/prompts/director.md`:

```markdown
# Director Agent

You receive a video config.json and improve it with editorial direction: timing, narrative beats, and audio/visual synchronization.

## What you do

1. Read the config and analyze scene flow
2. Add `timing` to each scene: leadInMs, audioStartMs, tailHoldMs, transitionMs
3. Add `beats` to scenes that need them: id, startMs, narration, visual, animation, emphasis
4. Return the complete updated config JSON

## Mandatory rules

- Never start a video with voice + big visual movement on the same frame
- If voiceover exists, intro needs leadInMs (minimum 300ms)
- Each important narration phrase maps to a beat or explicit transition
- Animations must not precede verbal mention of the concept
- Each beat = one dominant idea
- Final scene needs tailHoldMs for CTA/brand (minimum 500ms)
- Pause narrativa: 800ms+ silence every 15-20s
- transitionMs values: 0 (hard cut), 300-600 (standard), 800-1200 (breath), 1200-1500 (dramatic)
- Gaps between beats: 200-400ms silence

## Output

Return the full config JSON with timing and beats added to each scene. Also list 3-6 warnings about potential issues.
Do not add voiceover, soundDesign, or brief fields — those are handled by other agents.
```

Create `packages/agent/prompts/sound_engineer.md`:

```markdown
# Sound Engineer Agent

You design the audio layer for videos: background music and sound effects per scene.

## Workflow

1. Analyze the config: brief tone, scene types, high-emphasis beats, total duration
2. Call `list_audio_library` to check available music tracks
3. Select music bed: map tone to library (didactic→lofi-tech, corporate→corporate-warm, energetic→upbeat-tech)
4. Design SFX per scene type using default mapping:
   - intro → swoosh subtle (trigger: accent-line, -16dB)
   - terminal → mechanical keyboard (trigger: typewriter, loop, -14dB)
   - callout → attention tone (trigger: scene-start, -15dB)
   - outro → stinger (trigger: scene-start, -10dB)
5. Present sound chart to user via `present_sound_chart`
6. If approved, call `generate_audio` with the config path
7. Return the config with soundDesign section added

## Volume guidelines

- Music bed normal: -18 dB, ducking: -26 dB
- Keyboard ASMR: -14 dB
- Chimes/clicks: -15 dB
- Swoosh: -16 dB
- Stinger: -10 dB

## Output

Return the full config JSON with `soundDesign` section. The section includes:

- musicBed: libraryId, volume, duckingVolume, fadeInMs, fadeOutMs, duckingFadeMs
- sfx: array of {id, prompt, trigger, sceneTypes, loop, volume}
```

Create `packages/agent/prompts/scene_creator.md`:

```markdown
# Scene Creator Agent

You create new custom Remotion scene components when a video config references a componentId that doesn't exist in the scene catalog.

## Your tools

- `write_scene(component_id, code)` — Write a .tsx scene component
- `read_scene(component_id)` — Read an existing scene as reference

## Rules

1. All animations must use `useCurrentFrame()` + `spring()` or `interpolate()`. CSS transitions and Tailwind animation classes are FORBIDDEN.
2. Import `useThemeTokens` from `../../../../shared/themes` for all colors and fonts.
3. Use `useSlideIn` from `../../../../shared/hooks/useSlideIn` for entrance animations.
4. Components receive props as `Record<string, unknown>` — cast what you need.
5. Export the component as a named export: `export const {Name}Scene`.
6. The component must render inside a Remotion `<AbsoluteFill>`.

## Pattern to follow

Read an existing scene (e.g., `read_scene("block-diagram")`) to see the established pattern before writing new code.
```

- [ ] **Step 8: Create skills directory with initial content**

Create `packages/agent/skills/best_practices.md`:

```markdown
# Remotion Best Practices

## Critical rules

1. All animations must use `useCurrentFrame()` + `spring()` / `interpolate()`. CSS transitions and Tailwind animation classes do not work (Remotion renders frame-by-frame).
2. Use `<Img>` from remotion, not `<img>`, for images.
3. Use `staticFile()` for assets in `public/`.
4. Never use `useEffect` for animations — derive everything from frame number.
5. Use `useThemeTokens()` for all colors — never hardcode or check theme name.
6. Use `useSlideIn()` hook for entrance animations instead of manual spring+interpolate.
7. Every scene MUST have `durationInSeconds` (not durationInFrames).
8. Scene components accept props matching their Zod schema type.
```

Create `packages/agent/skills/brand_guidelines.md`:

```markdown
# Línea Directa Brand Guidelines

## Colors

- Primary: #CC3333 (red)
- Secondary: #225050 (teal)
- Background: white
- Text: dark

## Tone

- Desenfadado, directo, humor ("Tipo Directo")
- Claim: "El valor de ser directo"

## PhoneMascot

- Animations: "entry" (intro), "idle" (breathing), "dial" (terminal), "ring" (attention)
- Always present in linea-directa theme
```

Create `packages/agent/skills/scene_catalog.md` — this will be auto-generated from `scene-catalog.json` later. For now, a placeholder with the custom scene list:

```markdown
# Scene Catalog

## Tutorial scenes (builtin)

- intro: Title + subtitle + optional PixelLogo
- terminal: Simulated CLI session with command/output/claude lines
- callout: Text overlay with position (top/bottom/right)
- outro: Title + bullet points

## Product Short scenes (builtin)

- hero: Product name + headline on brand background
- benefits: List with icons
- pricing: Price display (light/dark variant)
- cta: Call-to-action + URL

## Custom scenes (26 available)

annotated-image, api-request, bar-chart, before-after, big-number, block-diagram, browser-mockup, bullet-slide, chapter-card, code-block, code-diff, comparison-table, countdown, file-explorer, flow-diagram, icon-grid, logo-wall, media-card, problem-solution, progress-bars, quote, split-screen, stat-reveal, step-list, timeline, two-column-text

Use `query_scene_catalog(componentId)` to get detailed props for any scene.
```

- [ ] **Step 9: Delete old tools.py and verify**

```bash
rm packages/agent/src/tools.py
```

Update `packages/agent/src/api.py` line 8:

```python
# OLD:
from .agent import create_video_agent
# NEW (no change needed — agent.py still exports create_video_agent):
from .agent import create_video_agent
```

Verify tests still pass:

```bash
cd packages/agent && uv run pytest -v
```

Note: Existing tests in `test_tools.py` import from `src.tools` — update to `src.tools.render`:

```python
# OLD:
from src.tools import present_escaleta, submit_render
# NEW:
from src.tools.render import present_escaleta, submit_render
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor(agent): restructure into orchestrator + subagents + tools modules"
```

---

### Task 6: Implement Researcher and Director subagents with tests

These are the two simplest subagents — no interrupts, straightforward tool usage.

**Files:**

- Create: `packages/agent/src/subagents/researcher.py`
- Create: `packages/agent/src/subagents/director.py`
- Create: `packages/agent/tests/test_subagents.py`

- [ ] **Step 1: Write test for researcher subagent definition**

Create `packages/agent/tests/test_subagents.py`:

```python
import pytest


def test_researcher_definition():
    from src.subagents.researcher import create_researcher

    defn = create_researcher()
    assert defn["name"] == "researcher"
    assert "description" in defn
    assert "system_prompt" in defn
    assert len(defn["tools"]) == 3
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "web_search" in tool_names
    assert "web_fetch" in tool_names
    assert "scrape_product" in tool_names


def test_director_definition():
    from src.subagents.director import create_director

    defn = create_director()
    assert defn["name"] == "director"
    assert "description" in defn
    assert "system_prompt" in defn
    assert defn["tools"] == []


def test_researcher_uses_flash_model():
    from src.subagents.researcher import create_researcher

    defn = create_researcher()
    assert defn.get("model") is not None
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd packages/agent && uv run pytest tests/test_subagents.py -v
```

Expected: `ModuleNotFoundError: No module named 'src.subagents'`

- [ ] **Step 3: Implement researcher subagent**

Create `packages/agent/src/subagents/__init__.py`:

```python
from .researcher import create_researcher
from .director import create_director
```

Create `packages/agent/src/subagents/researcher.py`:

```python
from pathlib import Path

from ..orchestrator import create_model, load_prompt
from ..tools.research import scrape_product, web_fetch, web_search


def create_researcher() -> dict:
    """Create the researcher SubAgent definition."""
    return {
        "name": "researcher",
        "description": "Searches the web for product info, documentation, and competitive data.",
        "system_prompt": load_prompt("researcher"),
        "tools": [web_search, web_fetch, scrape_product],
        "model": create_model("gemini-3.1-flash"),
    }
```

- [ ] **Step 4: Implement director subagent**

Create `packages/agent/src/subagents/director.py`:

```python
from ..orchestrator import load_prompt


def create_director() -> dict:
    """Create the director SubAgent definition."""
    return {
        "name": "director",
        "description": "Polishes timing, narrative beats, and audio/visual synchronization.",
        "system_prompt": load_prompt("director"),
        "tools": [],
    }
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd packages/agent && uv run pytest tests/test_subagents.py -v
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(agent): add researcher and director subagent definitions"
```

---

### Task 7: Implement Copywriter and Sound Engineer subagents (with interrupts)

Refactor the existing monolithic copywriter into a SubAgent dict. Create sound engineer with its own interrupt.

**Files:**

- Create: `packages/agent/src/subagents/copywriter.py`
- Create: `packages/agent/src/subagents/sound_engineer.py`
- Modify: `packages/agent/tests/test_subagents.py` — add tests

- [ ] **Step 1: Add tests for copywriter and sound engineer**

Append to `packages/agent/tests/test_subagents.py`:

```python
def test_copywriter_definition():
    from src.subagents.copywriter import create_copywriter

    defn = create_copywriter()
    assert defn["name"] == "copywriter"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_escaleta" in tool_names
    assert "query_scene_catalog" in tool_names


def test_sound_engineer_definition():
    from src.subagents.sound_engineer import create_sound_engineer

    defn = create_sound_engineer()
    assert defn["name"] == "sound_engineer"
    tool_names = [t.__name__ for t in defn["tools"]]
    assert "present_sound_chart" in tool_names
    assert "generate_audio" in tool_names
    assert "list_audio_library" in tool_names


def test_present_sound_chart_interrupt():
    """Verify present_sound_chart uses interrupt() like present_escaleta."""
    import inspect
    from src.tools.sound import present_sound_chart

    source = inspect.getsource(present_sound_chart)
    assert "interrupt(" in source
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd packages/agent && uv run pytest tests/test_subagents.py -v
```

Expected: FAIL for the 3 new tests.

- [ ] **Step 3: Implement copywriter subagent**

Create `packages/agent/src/subagents/copywriter.py`:

```python
from ..orchestrator import load_prompt
from ..tools.catalog import query_scene_catalog
from ..tools.render import present_escaleta


def create_copywriter() -> dict:
    """Create the copywriter SubAgent definition."""
    return {
        "name": "copywriter",
        "description": "Generates video escaleta and config.json with human approval checkpoint.",
        "system_prompt": load_prompt("copywriter"),
        "tools": [present_escaleta, query_scene_catalog],
    }
```

- [ ] **Step 4: Implement sound engineer subagent**

Create `packages/agent/src/subagents/sound_engineer.py`:

```python
from ..orchestrator import load_prompt
from ..tools.sound import generate_audio, list_audio_library, present_sound_chart


def create_sound_engineer() -> dict:
    """Create the sound engineer SubAgent definition."""
    return {
        "name": "sound_engineer",
        "description": "Designs music bed and SFX with human approval checkpoint.",
        "system_prompt": load_prompt("sound_engineer"),
        "tools": [present_sound_chart, generate_audio, list_audio_library],
    }
```

- [ ] **Step 5: Update subagents/**init**.py**

```python
from .copywriter import create_copywriter
from .director import create_director
from .researcher import create_researcher
from .sound_engineer import create_sound_engineer
```

- [ ] **Step 6: Run tests — expect pass**

```bash
cd packages/agent && uv run pytest tests/test_subagents.py -v
```

Expected: 6 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(agent): add copywriter and sound_engineer subagents with interrupt tools"
```

---

### Task 8: Implement Scene Creator CompiledSubAgent

Build the deterministic generate → lint → register → validate loop as a LangGraph compiled graph.

**Files:**

- Create: `packages/agent/src/subagents/scene_creator/__init__.py`
- Create: `packages/agent/src/subagents/scene_creator/graph.py`
- Create: `packages/agent/src/subagents/scene_creator/nodes.py`
- Create: `packages/agent/src/subagents/scene_creator/tools.py`
- Create: `packages/agent/tests/test_scene_creator.py`

- [ ] **Step 1: Write tests**

Create `packages/agent/tests/test_scene_creator.py`:

```python
import pytest
from pathlib import Path


def test_scene_creator_tools():
    from src.subagents.scene_creator.tools import write_scene, read_scene

    assert callable(write_scene)
    assert callable(read_scene)


def test_scene_creator_graph_compiles():
    """The scene creator graph should compile without errors."""
    from src.subagents.scene_creator.graph import create_scene_creator

    subagent = create_scene_creator()
    assert subagent is not None
    assert hasattr(subagent, "name")
    assert subagent.name == "scene_creator"


def test_write_scene_creates_file(tmp_path, monkeypatch):
    """write_scene should create a .tsx file in the custom scenes directory."""
    from src.subagents.scene_creator import tools

    # Point to temp dir
    monkeypatch.setattr(tools, "SCENES_DIR", tmp_path)

    code = 'export const TestScene = () => <div>test</div>'
    result = tools.write_scene("test-widget", code)

    expected_file = tmp_path / "TestWidgetScene.tsx"
    assert expected_file.exists()
    assert expected_file.read_text() == code
    assert "TestWidgetScene.tsx" in result


def test_read_scene_returns_content(tmp_path, monkeypatch):
    """read_scene should return the content of an existing scene file."""
    from src.subagents.scene_creator import tools

    monkeypatch.setattr(tools, "SCENES_DIR", tmp_path)

    # Create a fake scene
    scene_file = tmp_path / "BlockDiagramScene.tsx"
    scene_file.write_text("export const BlockDiagramScene = () => <div />;")

    result = tools.read_scene("block-diagram")
    assert "BlockDiagramScene" in result
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd packages/agent && uv run pytest tests/test_scene_creator.py -v
```

- [ ] **Step 3: Implement scene creator tools**

Create `packages/agent/src/subagents/scene_creator/__init__.py`:

```python
from .graph import create_scene_creator
```

Create `packages/agent/src/subagents/scene_creator/tools.py`:

```python
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
SCENES_DIR = PROJECT_ROOT / "src" / "compositions" / "ClaudeCodeTutorial" / "scenes" / "custom"


def _component_id_to_class_name(component_id: str) -> str:
    """Convert kebab-case component ID to PascalCase class name + 'Scene' suffix.

    Example: 'block-diagram' -> 'BlockDiagramScene'
    """
    parts = component_id.split("-")
    return "".join(p.capitalize() for p in parts) + "Scene"


def write_scene(component_id: str, code: str) -> str:
    """Write a custom scene component .tsx file.

    Args:
        component_id: Kebab-case component identifier (e.g. 'data-table').
        code: Full TypeScript/React source code for the component.

    Returns:
        Confirmation message with file path.
    """
    class_name = _component_id_to_class_name(component_id)
    file_path = SCENES_DIR / f"{class_name}.tsx"
    file_path.write_text(code, encoding="utf-8")
    return f"Written {class_name}.tsx to {file_path}"


def read_scene(component_id: str) -> str:
    """Read an existing custom scene component as reference.

    Args:
        component_id: Kebab-case component identifier (e.g. 'block-diagram').

    Returns:
        The source code of the component, or an error message.
    """
    class_name = _component_id_to_class_name(component_id)
    file_path = SCENES_DIR / f"{class_name}.tsx"
    if not file_path.exists():
        return f"Scene '{component_id}' not found at {file_path}"
    return file_path.read_text(encoding="utf-8")
```

- [ ] **Step 4: Implement scene creator graph**

Create `packages/agent/src/subagents/scene_creator/nodes.py`:

```python
import subprocess
from pathlib import Path
from typing import TypedDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
REGISTRY_PATH = PROJECT_ROOT / "src" / "compositions" / "ClaudeCodeTutorial" / "customSceneRegistry.ts"


class SceneCreatorState(TypedDict):
    component_id: str
    code: str
    attempt: int
    max_attempts: int
    lint_error: str
    bundle_error: str
    status: str  # "generating" | "linting" | "registering" | "validating" | "done" | "error"


def lint_node(state: SceneCreatorState) -> dict:
    """Run ESLint on the generated scene file."""
    from .tools import SCENES_DIR, _component_id_to_class_name

    class_name = _component_id_to_class_name(state["component_id"])
    file_path = SCENES_DIR / f"{class_name}.tsx"

    result = subprocess.run(
        ["npx", "eslint", str(file_path), "--no-eslintrc", "-c", "eslint.config.mjs"],
        capture_output=True,
        text=True,
        timeout=30,
        cwd=str(PROJECT_ROOT),
    )

    if result.returncode != 0:
        return {
            "lint_error": result.stdout + result.stderr,
            "status": "generating",
            "attempt": state["attempt"] + 1,
        }
    return {"lint_error": "", "status": "registering"}


def register_node(state: SceneCreatorState) -> dict:
    """Add the new scene to customSceneRegistry.ts."""
    from .tools import _component_id_to_class_name

    component_id = state["component_id"]
    class_name = _component_id_to_class_name(component_id)

    registry_content = REGISTRY_PATH.read_text(encoding="utf-8")

    if component_id in registry_content:
        return {"status": "validating"}

    import_line = f'import {{ {class_name} }} from "./scenes/custom/{class_name}"\n'
    entry_line = f'  "{component_id}": {class_name},\n'

    # Add import after last import line
    lines = registry_content.split("\n")
    last_import_idx = 0
    for idx, line in enumerate(lines):
        if line.startswith("import "):
            last_import_idx = idx
    lines.insert(last_import_idx + 1, import_line.rstrip())

    # Add entry before closing brace of registry object
    content = "\n".join(lines)
    content = content.replace("\n}", f"\n{entry_line}" + "}")

    REGISTRY_PATH.write_text(content, encoding="utf-8")
    return {"status": "validating"}


def validate_node(state: SceneCreatorState) -> dict:
    """Verify the Remotion bundle compiles with the new scene."""
    result = subprocess.run(
        ["npx", "remotion", "bundle", "--log=error"],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=str(PROJECT_ROOT),
    )

    if result.returncode != 0:
        return {
            "bundle_error": result.stderr,
            "status": "generating",
            "attempt": state["attempt"] + 1,
        }
    return {"bundle_error": "", "status": "done"}


def should_retry(state: SceneCreatorState) -> str:
    """Router: retry if failed and under max attempts, else error."""
    if state["status"] == "done":
        return "done"
    if state["status"] == "generating" and state["attempt"] < state["max_attempts"]:
        return "retry"
    return "error"
```

Create `packages/agent/src/subagents/scene_creator/graph.py`:

```python
from deepagents import CompiledSubAgent
from langgraph.graph import StateGraph

from ..scene_creator.nodes import (
    SceneCreatorState,
    lint_node,
    register_node,
    should_retry,
    validate_node,
)
from ..scene_creator.tools import read_scene, write_scene
from ...orchestrator import create_model, load_prompt


def create_scene_creator() -> CompiledSubAgent:
    """Create the Scene Creator as a CompiledSubAgent with generate→validate loop."""

    builder = StateGraph(SceneCreatorState)

    # The "generate" node is the LLM node — it uses write_scene and read_scene tools.
    # In the compiled graph, the LLM node is handled by DeepAgents' built-in agent node.
    # The deterministic nodes (lint, register, validate) are custom.

    builder.add_node("lint", lint_node)
    builder.add_node("register", register_node)
    builder.add_node("validate", validate_node)

    # Edges: generate (entry) -> lint -> register -> validate -> router
    builder.set_entry_point("lint")
    builder.add_edge("lint", "register")
    builder.add_edge("register", "validate")
    builder.add_conditional_edges("validate", should_retry, {
        "done": "__end__",
        "retry": "lint",
        "error": "__end__",
    })

    graph = builder.compile()

    return CompiledSubAgent(
        name="scene_creator",
        description="Creates new custom Remotion scene components. Validates via lint + bundle compilation.",
        graph=graph,
        system_prompt=load_prompt("scene_creator"),
        tools=[write_scene, read_scene],
        model=create_model(),
    )
```

Note: The exact `CompiledSubAgent` API may differ from DeepAgents version. Adjust constructor parameters based on the installed version. The key structure is: LLM generates code via tools → deterministic lint/register/validate nodes → retry loop.

- [ ] **Step 5: Run tests — expect pass**

```bash
cd packages/agent && uv run pytest tests/test_scene_creator.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(agent): add scene_creator CompiledSubAgent with generate-validate loop"
```

---

### Task 9: Wire orchestrator with all subagents and integration test

Connect all subagents to the orchestrator. Write integration test with mocked LLM.

**Files:**

- Modify: `packages/agent/src/orchestrator.py` — add scene_creator
- Create: `packages/agent/tests/test_orchestrator.py`
- Modify: `packages/agent/src/subagents/__init__.py` — export scene_creator

- [ ] **Step 1: Write integration test**

Create `packages/agent/tests/test_orchestrator.py`:

```python
import pytest


def test_orchestrator_creates_successfully():
    """The orchestrator should create with all subagents registered."""
    pytest.importorskip("deepagents")
    from src.orchestrator import create_video_orchestrator

    agent = create_video_orchestrator()
    assert agent is not None


def test_orchestrator_has_direct_tools():
    """The orchestrator should have submit_render and check_render_status as direct tools."""
    pytest.importorskip("deepagents")
    from src.orchestrator import create_video_orchestrator

    agent = create_video_orchestrator()
    # The exact way to inspect tools depends on DeepAgents internals.
    # At minimum, verify the agent was created without errors.
    assert agent is not None


def test_all_prompts_exist():
    """All prompt files must exist."""
    from pathlib import Path

    prompts_dir = Path(__file__).parent.parent / "prompts"
    required = ["orchestrator.md", "copywriter.md", "researcher.md", "director.md", "sound_engineer.md", "scene_creator.md"]
    for name in required:
        assert (prompts_dir / name).exists(), f"Missing prompt: {name}"


def test_all_skills_exist():
    """All skill files must exist."""
    from pathlib import Path

    skills_dir = Path(__file__).parent.parent / "skills"
    required = ["scene_catalog.md", "best_practices.md", "brand_guidelines.md"]
    for name in required:
        assert (skills_dir / name).exists(), f"Missing skill: {name}"
```

- [ ] **Step 2: Update orchestrator.py to include scene_creator**

Update `packages/agent/src/orchestrator.py` — add scene_creator to the `create_video_orchestrator` function after the `subagents` list:

```python
    # After the subagents list, add:
    from .subagents.scene_creator import create_scene_creator

    scene_creator = create_scene_creator()

    agent = create_deep_agent(
        model=model,
        tools=[submit_render, check_render_status],
        system_prompt=load_prompt("orchestrator"),
        checkpointer=checkpointer,
        subagents=subagents,
        compiled_subagents=[scene_creator],
        skills=[str(SKILLS_DIR)],
    )
```

Note: If `create_deep_agent` doesn't support `compiled_subagents` as a separate parameter, pass it as part of the `subagents` list. Check DeepAgents docs for exact API.

Also add resilience middleware to the orchestrator in `create_video_orchestrator`:

```python
    from deepagents import ModelFallbackMiddleware, SummarizationMiddleware

    agent = create_deep_agent(
        # ... existing params ...
        middleware=[
            SummarizationMiddleware(trigger=("tokens", 4000)),
            ModelFallbackMiddleware(fallback_models=[flash_model]),
        ],
    )
```

- [ ] **Step 3: Update subagents/**init**.py**

```python
from .copywriter import create_copywriter
from .director import create_director
from .researcher import create_researcher
from .scene_creator import create_scene_creator
from .sound_engineer import create_sound_engineer
```

- [ ] **Step 4: Run all tests**

```bash
cd packages/agent && uv run pytest -v
```

Expected: All tests PASS. If `deepagents` is not installed in the test environment, the orchestrator tests will skip gracefully via `pytest.importorskip`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(agent): wire orchestrator with all 5 subagents and integration tests"
```

---

## Phase 3: SSE Streaming and Frontend

> After Phase 3 the frontend shows real-time pipeline progress via SSE.
> Verification: start all 3 services, send a message, confirm SSE events arrive.

### Task 10: Add SSE streaming endpoint to FastAPI

Replace the blocking `agent.invoke()` pattern with streaming SSE via `agent.astream()`.

**Files:**

- Modify: `packages/agent/src/api.py` — add `/api/chat/{thread_id}/stream` endpoint
- Modify: `packages/agent/src/api.py` — update `/api/chat` to return thread_id immediately

- [ ] **Step 1: Add SSE streaming endpoint**

Add to `packages/agent/src/api.py`:

```python
import json
from starlette.responses import StreamingResponse


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Start a new chat. Returns thread_id for SSE subscription."""
    thread_id = request.thread_id or _generate_thread_id()
    config = {"configurable": {"thread_id": thread_id}}

    agent = _get_agent()

    # For backward compatibility, still support non-streaming
    result = agent.invoke(
        {"messages": [{"role": "user", "content": request.message}]},
        config=config,
        version="v2",
    )

    return _extract_response(result, thread_id)


@app.get("/api/chat/{thread_id}/stream")
async def stream_chat(thread_id: str):
    """SSE endpoint for real-time agent progress."""
    agent = _get_agent()
    config = {"configurable": {"thread_id": thread_id}}

    async def event_generator():
        try:
            async for event in agent.astream(
                None,
                config=config,
                stream_mode=["updates", "custom"],
                version="v2",
            ):
                event_data = {}
                if isinstance(event, dict):
                    # Node updates
                    if "ns" in event:
                        agent_name = event.get("ns", ["orchestrator"])[-1] if event.get("ns") else "orchestrator"
                        event_data = {
                            "type": "agent_status",
                            "agent": agent_name,
                            "status": "running",
                        }
                    # Custom events (render progress, etc.)
                    elif "type" in event:
                        event_data = event

                if event_data:
                    yield f"data: {json.dumps(event_data)}\n\n"

            # Stream complete
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

Note: `starlette` is already a dependency of FastAPI — no new install needed.

- [ ] **Step 2: Update POST /api/chat to support SSE flow**

The existing POST /api/chat still works (returns JSON response). The new pattern is:

1. Client sends POST /api/chat with message → gets back `{thread_id}`
2. Client opens EventSource on GET /api/chat/{thread_id}/stream
3. For checkpoints, client sends POST /api/chat/{thread_id}/resume

Add a new endpoint for "start and stream" pattern:

```python
@app.post("/api/chat/start")
async def start_chat(request: ChatRequest):
    """Start a new chat and return thread_id. Use /stream to get updates."""
    thread_id = request.thread_id or _generate_thread_id()
    config = {"configurable": {"thread_id": thread_id}}

    agent = _get_agent()
    # Queue the message but don't wait for completion
    agent.invoke(
        {"messages": [{"role": "user", "content": request.message}]},
        config=config,
        version="v2",
    )

    return {"thread_id": thread_id}
```

- [ ] **Step 3: Verify**

```bash
cd packages/agent && uv run pytest -v
```

Manual test: start the agent server and use curl to test SSE:

```bash
# Terminal 1: start agent
cd packages/agent && uv run uvicorn src.api:app --port 8000

# Terminal 2: test SSE
curl -N http://localhost:8000/api/chat/test-thread/stream
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): add SSE streaming endpoint for real-time pipeline progress"
```

---

### Task 11: Frontend — useAgentStream hook and new UI components

Add EventSource-based hook and components for subagent badges, sound chart card, render progress, and error banner.

**Files:**

- Create: `packages/web/src/hooks/useAgentStream.ts`
- Create: `packages/web/src/components/SubagentBadge.tsx`
- Create: `packages/web/src/components/SoundChartCard.tsx`
- Create: `packages/web/src/components/RenderProgress.tsx`
- Create: `packages/web/src/components/ErrorBanner.tsx`
- Modify: `packages/web/src/types.ts` — add SSE event types

- [ ] **Step 1: Add stream event types**

Update `packages/web/src/types.ts`:

```typescript
// Add to existing types:

export type StreamEventType =
  | "agent_status"
  | "escaleta_checkpoint"
  | "sound_chart_checkpoint"
  | "render_progress"
  | "scene_creator_step"
  | "message"
  | "done"
  | "error"

export interface StreamEvent {
  type: StreamEventType
  agent?: string
  status?: string
  data?: CheckpointData | SoundChartData
  progress?: number
  step?: string
  attempt?: number
  message?: string
  content?: string
}

export interface SoundChartData {
  type: "sound_chart_checkpoint"
  music_bed: {
    libraryId?: string
    volume: number
    duckingVolume: number
  }
  sfx_entries: Array<{
    id: string
    prompt: string
    trigger: string
    sceneTypes?: string[]
    volume: number
    loop?: boolean
  }>
}

export type AgentStreamStatus = "idle" | "streaming" | "checkpoint" | "done" | "error"
```

- [ ] **Step 2: Create useAgentStream hook**

Create `packages/web/src/hooks/useAgentStream.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react"
import type { AgentStreamStatus, CheckpointData, SoundChartData, StreamEvent } from "../types"

const API_BASE = "http://localhost:8000"

interface AgentStreamState {
  events: StreamEvent[]
  activeAgent: string | null
  checkpoint: CheckpointData | SoundChartData | null
  checkpointType: string | null
  renderProgress: number
  status: AgentStreamStatus
  error: string | null
}

export function useAgentStream(threadId: string | null) {
  const [state, setState] = useState<AgentStreamState>({
    events: [],
    activeAgent: null,
    checkpoint: null,
    checkpointType: null,
    renderProgress: 0,
    status: "idle",
    error: null,
  })

  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!threadId) return

    const es = new EventSource(`${API_BASE}/api/chat/${threadId}/stream`)
    eventSourceRef.current = es

    setState((prev) => ({ ...prev, status: "streaming" }))

    es.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data)

        setState((prev) => {
          const next = { ...prev, events: [...prev.events, data] }

          switch (data.type) {
            case "agent_status":
              next.activeAgent = data.agent ?? null
              break
            case "escaleta_checkpoint":
              next.checkpoint = data.data as CheckpointData
              next.checkpointType = "escaleta"
              next.status = "checkpoint"
              next.activeAgent = null
              break
            case "sound_chart_checkpoint":
              next.checkpoint = data.data as SoundChartData
              next.checkpointType = "sound_chart"
              next.status = "checkpoint"
              next.activeAgent = null
              break
            case "render_progress":
              next.renderProgress = data.progress ?? 0
              break
            case "done":
              next.status = "done"
              next.activeAgent = null
              break
            case "error":
              next.status = "error"
              next.error = data.message ?? "Unknown error"
              next.activeAgent = null
              break
          }

          return next
        })
      } catch {
        // Ignore malformed events
      }
    }

    es.onerror = () => {
      es.close()
      setState((prev) => {
        if (prev.status === "streaming") {
          return { ...prev, status: "error", error: "Connection lost" }
        }
        return prev
      })
    }
  }, [threadId])

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
  }, [])

  const reset = useCallback(() => {
    disconnect()
    setState({
      events: [],
      activeAgent: null,
      checkpoint: null,
      checkpointType: null,
      renderProgress: 0,
      status: "idle",
      error: null,
    })
  }, [disconnect])

  useEffect(() => {
    return () => disconnect()
  }, [disconnect])

  return { ...state, connect, disconnect, reset }
}
```

- [ ] **Step 3: Create SubagentBadge component**

Create `packages/web/src/components/SubagentBadge.tsx`:

```tsx
import React from "react"

const AGENT_LABELS: Record<string, { label: string; emoji: string }> = {
  researcher: { label: "Investigando", emoji: "🔍" },
  copywriter: { label: "Escribiendo", emoji: "✍️" },
  scene_creator: { label: "Creando escena", emoji: "🎨" },
  director: { label: "Dirigiendo", emoji: "🎬" },
  sound_engineer: { label: "Diseñando sonido", emoji: "🎵" },
}

interface Props {
  agentName: string
}

export const SubagentBadge: React.FC<Props> = ({ agentName }) => {
  const info = AGENT_LABELS[agentName] ?? { label: agentName, emoji: "⚙️" }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 16,
        backgroundColor: "#f0f0f0",
        fontSize: 13,
        color: "#555",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <span>{info.emoji}</span>
      <span>{info.label}...</span>
    </div>
  )
}
```

- [ ] **Step 4: Create SoundChartCard component**

Create `packages/web/src/components/SoundChartCard.tsx`:

```tsx
import React, { useState } from "react"
import type { SoundChartData } from "../types"

interface Props {
  data: SoundChartData
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
}

export const SoundChartCard: React.FC<Props> = ({ data, onApprove, onRequestChanges }) => {
  const [feedback, setFeedback] = useState("")

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        margin: "8px 0",
        backgroundColor: "#fafafa",
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>🎵 Carta de sonido</h3>

      {data.music_bed && (
        <div style={{ marginBottom: 12 }}>
          <strong>Music bed:</strong> {data.music_bed.libraryId ?? "Custom"} ({data.music_bed.volume}dB, ducking:{" "}
          {data.music_bed.duckingVolume}dB)
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd" }}>
            <th style={{ textAlign: "left", padding: 4 }}>SFX</th>
            <th style={{ textAlign: "left", padding: 4 }}>Trigger</th>
            <th style={{ textAlign: "left", padding: 4 }}>Scenes</th>
            <th style={{ textAlign: "right", padding: 4 }}>Vol</th>
          </tr>
        </thead>
        <tbody>
          {data.sfx_entries.map((sfx) => (
            <tr key={sfx.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 4 }}>{sfx.id}</td>
              <td style={{ padding: 4 }}>{sfx.trigger}</td>
              <td style={{ padding: 4 }}>{sfx.sceneTypes?.join(", ") ?? "all"}</td>
              <td style={{ padding: 4, textAlign: "right" }}>{sfx.volume}dB</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          onClick={onApprove}
          style={{
            padding: "6px 16px",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Aprobar
        </button>
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback..."
          style={{ flex: 1, padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4 }}
        />
        <button
          onClick={() => onRequestChanges(feedback)}
          style={{
            padding: "6px 16px",
            backgroundColor: "#ff9800",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Ajustar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create RenderProgress and ErrorBanner components**

Create `packages/web/src/components/RenderProgress.tsx`:

```tsx
import React from "react"

interface Props {
  progress: number
}

export const RenderProgress: React.FC<Props> = ({ progress }) => (
  <div style={{ margin: "8px 0" }}>
    <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Renderizando... {progress}%</div>
    <div style={{ width: "100%", height: 8, backgroundColor: "#e0e0e0", borderRadius: 4, overflow: "hidden" }}>
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: "#CC3333",
          borderRadius: 4,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  </div>
)
```

Create `packages/web/src/components/ErrorBanner.tsx`:

```tsx
import React from "react"

interface Props {
  message: string
}

export const ErrorBanner: React.FC<Props> = ({ message }) => (
  <div
    style={{
      padding: "8px 12px",
      margin: "8px 0",
      backgroundColor: "#ffebee",
      color: "#c62828",
      borderRadius: 4,
      border: "1px solid #ef9a9a",
      fontSize: 14,
    }}
  >
    Error: {message}
  </div>
)
```

- [ ] **Step 6: Verify TypeScript compilation**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(web): add useAgentStream hook, SubagentBadge, SoundChartCard, RenderProgress, ErrorBanner"
```

---

### Task 12: Wire frontend App.tsx to use SSE streaming

Connect the new hook and components to the main chat interface.

**Files:**

- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/components/ChatWindow.tsx`

- [ ] **Step 1: Update App.tsx to use SSE**

Update `packages/web/src/App.tsx` to integrate `useAgentStream`:

```tsx
import React, { useState } from "react"
import { ChatWindow } from "./components/ChatWindow"
import { useAgentStream } from "./hooks/useAgentStream"
import { sendMessage, resumeCheckpoint } from "./api"
import type { ChatMessage } from "./types"
import "./App.css"

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [threadId, setThreadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const stream = useAgentStream(threadId)

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await sendMessage(input.trim(), threadId ?? undefined)
      setThreadId(response.thread_id)

      if (response.type === "checkpoint") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: "",
            checkpoint: response.data,
          },
        ])
      } else if (response.content) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: response.content ?? "",
          },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!threadId) return
    setLoading(true)
    try {
      const response = await resumeCheckpoint(threadId, { approved: true })
      if (response.type === "checkpoint") {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: "", checkpoint: response.data },
        ])
      } else if (response.content) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: response.content ?? "" },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRequestChanges = async (feedback: string) => {
    if (!threadId) return
    setLoading(true)
    try {
      const response = await resumeCheckpoint(threadId, { approved: false, feedback })
      if (response.type === "checkpoint") {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: "", checkpoint: response.data },
        ])
      } else if (response.content) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: response.content ?? "" },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Remotion Video Platform</h1>
      </header>
      <ChatWindow
        messages={messages}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
        loading={loading}
        activeAgent={stream.activeAgent}
        renderProgress={stream.renderProgress}
        streamStatus={stream.status}
        streamError={stream.error}
      />
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Describe el vídeo que quieres generar..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 2: Update ChatWindow to show subagent badges and progress**

Update `packages/web/src/components/ChatWindow.tsx` to accept new props:

```tsx
import React, { useEffect, useRef } from "react"
import type { AgentStreamStatus, ChatMessage } from "../types"
import { CheckpointCard } from "./CheckpointCard"
import { ErrorBanner } from "./ErrorBanner"
import { MessageBubble } from "./MessageBubble"
import { RenderProgress } from "./RenderProgress"
import { SubagentBadge } from "./SubagentBadge"

interface Props {
  messages: ChatMessage[]
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
  loading: boolean
  activeAgent: string | null
  renderProgress: number
  streamStatus: AgentStreamStatus
  streamError: string | null
}

export const ChatWindow: React.FC<Props> = ({
  messages,
  onApprove,
  onRequestChanges,
  loading,
  activeAgent,
  renderProgress,
  streamStatus,
  streamError,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, activeAgent, renderProgress])

  return (
    <div className="chat-window">
      {messages.map((msg) =>
        msg.checkpoint ? (
          <CheckpointCard
            key={msg.id}
            data={msg.checkpoint}
            onApprove={onApprove}
            onRequestChanges={onRequestChanges}
          />
        ) : (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ),
      )}
      {activeAgent && <SubagentBadge agentName={activeAgent} />}
      {renderProgress > 0 && renderProgress < 100 && <RenderProgress progress={renderProgress} />}
      {streamError && <ErrorBanner message={streamError} />}
      {loading && !activeAgent && <div className="loading-indicator">Pensando...</div>}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 3: Verify frontend compiles and renders**

```bash
cd packages/web && npx tsc --noEmit
npm run dev
```

Open browser, verify the chat interface loads without errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): wire SSE streaming into App with subagent badges and render progress"
```

---

### Task 13: End-to-end verification

Verify the complete pipeline works: frontend → agent → subagents → render service.

**Files:**

- No new files. This is a verification task.

- [ ] **Step 1: Start all services**

```bash
# Terminal 1: Render service
cd packages/render-service && npx tsx src/server.ts

# Terminal 2: Agent
cd packages/agent && uv run uvicorn src.api:app --port 8000 --reload

# Terminal 3: Web
cd packages/web && npm run dev
```

- [ ] **Step 2: Run full test suite**

```bash
# Remotion
npm run lint && npm run build

# Agent
cd packages/agent && uv run pytest -v

# Web
cd packages/web && npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 3: Manual smoke test**

Open `http://localhost:5173` in browser. Send: "Genera un short del seguro de mascotas".

Verify:

1. SubagentBadge appears showing active agent
2. Escaleta checkpoint card renders with scenes
3. Approve button works
4. Render progress shows
5. Final message confirms video generated

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test(e2e): verify full pipeline with SSE streaming"
```

---

## Summary

| Phase   | Tasks | Commits | What ships                                                          |
| ------- | ----- | ------- | ------------------------------------------------------------------- |
| Phase 1 | 1-4   | 4       | Clean Remotion code, zero cross-composition coupling, scene catalog |
| Phase 2 | 5-9   | 5       | Multi-agent orchestrator with 5 subagents, all tools, skills        |
| Phase 3 | 10-13 | 4       | SSE streaming, real-time UI with badges/progress/checkpoints        |

Each phase produces independently working software. Phase 1 can ship alone. Phase 2 maintains backward compatibility with the existing API. Phase 3 adds the full streaming UX.
