# Audio-Visual Sync Platform Design

**Date:** 2026-05-13
**Status:** Draft
**Problem:** Scenes start with blank/empty screens while voiceover is already playing. Elements animate in too slowly (500-1000ms), creating dead air. The timing model requires agents to generate precise millisecond values they can't reason about.

## Decision

Replace the agent-driven timing model (leadInMs/audioStartMs) with an auto-calculated system based on a Scene Timing Registry. Adopt a mandatory Two-Phase Animation Pattern for all scene components. Extend enforcement to prompts, skills, validation, and runtime guardrails — four layers of defense.

## Architecture

### New Timing Model

**Before:** Agents generate `leadInMs` and `audioStartMs` in config.json. Renderer uses those values to delay audio. Agents guess at timing values without understanding animation durations.

**After:** Each scene type registers its `visualReadyMs` (how long until Phase 1 content is visible). Renderer auto-calculates `audioStartMs = visualReadyMs`. Agents focus on creative decisions (beats, content) — never timing arithmetic.

### Four-Layer Defense

| Layer                 | When            | What                                                                                                                                                                               |
| --------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Prompts & Skills   | Generation time | Agents learn Two-Phase pattern via `scene-timing-guide` skill. Director/audio_planner stop generating leadInMs/audioStartMs. Scene creator mandates Two-Phase for new components.  |
| 2. Code Defaults      | Component level | Scene Registry (`sceneTimingRegistry.ts`) maps scene types → visualReadyMs. New hooks: `usePhase1Entry()` (max 200ms), `useBeatReveal()` (beat-driven). All 22+ scenes refactored. |
| 3. Validation         | Pre-render      | 5 new rules: legacy field warnings, dead air detection, beat density, tail breathing room, duration vs content density.                                                            |
| 4. Runtime Guardrails | Render time     | `calculateMetadata.ts` auto-overrides audioStartMs to max(agentValue, visualReadyMs). Logs adjustments. Extends scene duration if needed.                                          |

## Two-Phase Animation Pattern

Every scene component must structure its animations in two phases:

### Phase 1: Instant Entry (0 → visualReadyMs, max 200ms)

Core layout appears immediately or near-instantly:

- Title text — visible at frame 0 or within 100ms
- Card/container frame — visible immediately
- Background elements — no animation needed
- Scene structure (grid, columns, layout) — visible immediately

**Contract:** When Phase 1 completes, the viewer instantly sees WHAT this scene is about. Voice can start.

### Phase 2: Progressive Reveal (beat-driven, synced with voiceover)

Supporting elements appear as the voice mentions them:

- Bullet points — each appears on its narration beat
- Diagram nodes — draw as voice describes flow
- Stats/numbers — count up when voice cites them
- Highlights/accents — emphasize what voice is discussing

**Contract:** Voice says it, screen shows it — synchronized storytelling.

### Per Scene Type Breakdown

| Scene Type                   | Phase 1 (instant)                    | Phase 2 (beat-driven)                   | visualReadyMs |
| ---------------------------- | ------------------------------------ | --------------------------------------- | ------------- |
| IntroScene                   | Title, lockup, background            | Subtitle fade, accent line              | 100           |
| TerminalScene                | Terminal window chrome, status bar   | Lines type in (typing IS the animation) | 150           |
| CalloutScene                 | Card frame + icon + title            | Body text, CTA highlight                | 100           |
| BulletSlideScene             | Title, subtitle, accent line         | Each bullet on its beat                 | 100           |
| IconGridScene                | Title, grid layout frame             | Each icon+label on its beat             | 100           |
| SplitScreenScene             | Title, left/right columns, separator | Items per column on beats               | 100           |
| CodeBlockScene               | Code card chrome, title, filename    | Lines reveal progressively              | 150           |
| FlowDiagramScene             | Title, node outlines/placeholders    | Connections draw, nodes fill            | 150           |
| ComparisonTableScene         | Title, column headers, table frame   | Rows appear per beat                    | 100           |
| StatRevealScene              | Label, frame/container               | Number counts up on beat, bar fills     | 100           |
| FileExplorerScene            | File tree sidebar visible            | Files expand, content reveals           | 150           |
| QuoteScene                   | Quote marks, card background         | Text + attribution on beats             | 100           |
| BlockDiagramScene            | Title, block outlines/wireframe      | Blocks fill + connect on beats          | 150           |
| OutroScene                   | Title, brand, CTA                    | Social links, final message             | 100           |
| HeroScene (ProductShort)     | Mascot, text, background             | Accent animations                       | 100           |
| BenefitsScene (ProductShort) | Title, accent line                   | Items on beats                          | 100           |
| PricingScene (ProductShort)  | Frame/container                      | Number counts on beat                   | 100           |
| CtaScene (ProductShort)      | Text, brand elements                 | Pulse decorations                       | 100           |

**Future custom scenes** follow the same pattern — scene_creator agent mandates Two-Phase + visualReadyMs registration.

**Default for unregistered scenes:** `DEFAULT_VISUAL_READY_MS = 200`

## New Hooks API

### usePhase1Entry

Fast entry for core layout elements. Max 200ms.

```typescript
const { opacity, scale } = usePhase1Entry({
  durationMs: 150, // max 200ms
})
```

Returns interpolated values from frame 0 to durationMs. Opacity 0→1, optional scale 0.97→1.

### useBeatReveal

Beat-driven reveal for supporting elements. Waits for beat's startMs, then animates in.

```typescript
const { opacity, y } = useBeatReveal({
  beat: beats[2], // which beat triggers this element
  animationMs: 300, // reveal animation duration
})
```

If no beat is provided, falls back to staggered entry after Phase 1. Stagger offset is auto-calculated: `visualReadyMs + (index * 150ms)`, where index is the element's position among its siblings. This ensures content-dense scenes without beats still reveal progressively rather than all at once.

### useSlideIn (kept, repurposed)

Not deleted. Still available for Phase 2 staggered reveals where `useBeatReveal` fallback is used. No longer the primary entrance mechanism.

## Scene Timing Registry

New file: `src/shared/sceneTimingRegistry.ts`

```typescript
export const sceneTimingRegistry: Record<string, { visualReadyMs: number }> = {
  intro: { visualReadyMs: 100 },
  terminal: { visualReadyMs: 150 },
  callout: { visualReadyMs: 100 },
  outro: { visualReadyMs: 100 },
  "bullet-slide": { visualReadyMs: 100 },
  "icon-grid": { visualReadyMs: 100 },
  "split-screen": { visualReadyMs: 100 },
  "code-block": { visualReadyMs: 150 },
  "flow-diagram": { visualReadyMs: 150 },
  "comparison-table": { visualReadyMs: 100 },
  "stat-reveal": { visualReadyMs: 100 },
  "file-explorer": { visualReadyMs: 150 },
  quote: { visualReadyMs: 100 },
  "block-diagram": { visualReadyMs: 150 },
  // ... all registered custom scene types
} as const

export const DEFAULT_VISUAL_READY_MS = 200
```

Used by:

- `calculateMetadata.ts` — auto-set audioStartMs
- `validation.py` — dead air detection (via render-service API or hardcoded copy)
- `useScenePrecomputation.ts` — audioDelayFrames calculation
- `CompositionShell.tsx` — audio Sequence offset

## Agent Pipeline Changes

### New Skill: scene-timing-guide

**Path:** `packages/agent/skills/scene-timing-guide/SKILL.md`

**Read by:** director, audio_planner, scene_creator, copywriter

**Contents:**

- Two-Phase Animation Pattern definition and rationale
- visualReadyMs table for all registered scene types
- What agents should NOT generate (leadInMs, audioStartMs — auto-calculated)
- What agents SHOULD generate (beats, tailHoldMs, transitionMs)
- Beat placement rules: first beat startMs >= scene's visualReadyMs
- Dead air definition: voice playing while screen has no visible content = forbidden
- Scene duration formula: visualReadyMs + audioDuration + tailHoldMs (auto-calculated)
- Key principle: "You decide WHAT to show and WHAT to say. The platform decides WHEN to sync them."

### Prompt Modifications

#### director.md

**Remove:**

- "If voiceover exists, intro needs leadInMs (minimum 300ms)"
- "Never start video with voice + major visual movement on same frame"
- All guidance about setting leadInMs and audioStartMs values

**Add:**

- "Read: scene-timing-guide skill"
- "Audio sync is AUTO-CALCULATED. Do NOT set leadInMs or audioStartMs."
- "Your job: define beats that sync narration with visual reveals."
- "First beat startMs must be >= scene's visualReadyMs (see scene-timing-guide)."
- "Each beat needs: id, startMs, narration (what voice says), visual (what appears)."
- "tailHoldMs: set only if scene needs extra hold (CTA, brand moment). Default 350ms is fine."

**Keep unchanged:** Beat structure, transitionMs guidance, 800ms+ narrative pauses, 200-400ms silence between beats, scenes >4s should have beats.

#### audio_planner.md

**Remove:**

- Per-scene timing overrides: `"0": { "text": "...", "leadInMs": 500 }`
- All guidance about setting timing values in voiceover scenes

**Add:**

- "Read: scene-timing-guide skill"
- "Audio sync is automatic. Do NOT add leadInMs overrides to voiceover scenes."
- "Voiceover format is always simple: `{ "0": "texto", "1": "texto" }`"
- "The renderer will auto-delay voiceover start until visuals are ready."

#### scene_creator.md

**Add (mandatory for all new components):**

- "Read: scene-timing-guide skill BEFORE creating any component."
- "MANDATORY: All custom scenes MUST follow the Two-Phase Animation Pattern"
- "1. Use `usePhase1Entry()` for core layout elements (title, card frame, background)"
- "2. Use `useBeatReveal()` for supporting elements (items, stats, diagrams)"
- "3. Phase 1 must complete in <=200ms"
- "4. Phase 2 elements appear on their beat's startMs"
- "5. If no beats provided, Phase 2 uses auto-staggered entry after Phase 1"
- "REGISTER TIMING: Export a `visualReadyMs` constant from your component"

**Remove:**

- References to `getSceneMotionDelayMs(timing)` for entrance animations
- Old useSlideIn entrance patterns with 500-700ms springs

**Update:** Example/template component rewritten with Two-Phase hooks.

#### copywriter.md

**Add:**

- "Read: scene-timing-guide skill for scene duration awareness."
- Duration-content rules: 2-3s per item + 1.5s overhead
- "Do NOT set timing fields. Only set durationInSeconds, type, and content."

### Skill Modifications

#### scene-catalog/SKILL.md

Add to each scene type entry:

- `visualReadyMs: <value>` — how long until Phase 1 completes
- `phase1: [list]` — what appears instantly
- `phase2: [list]` — what reveals on beats

#### remotion-director/SKILL.md

- Remove leadInMs/audioStartMs examples and "timing field purposes" section
- Add reference to scene-timing-guide for timing model
- Update examples showing timing:{} with only tailHoldMs and transitionMs

#### video-best-practices/SKILL.md

- Mark leadInMs and audioStartMs as DEPRECATED (auto-calculated)
- Keep tailHoldMs (default 350ms) and transitionMs
- Add "Two-Phase Animation" section referencing scene-timing-guide
- Update "Animation rules" with usePhase1Entry/useBeatReveal pattern

## Validation Rules (validation.py)

### Rule 1: Legacy Timing Fields Warning

```
if scene.timing.leadInMs or scene.timing.audioStartMs:
    WARN "Scene {i}: leadInMs/audioStartMs are deprecated.
    Audio sync is now auto-calculated. Remove these fields."
```

### Rule 2: Dead Air Detection

```
visualReadyMs = registry[scene.type] ?? 200
firstBeatMs = scene.beats[0].startMs if beats else None

if firstBeatMs and firstBeatMs < visualReadyMs:
    ERROR "Scene {i}: First beat at {firstBeatMs}ms starts before
    visuals are ready ({visualReadyMs}ms). Move beat to >= {visualReadyMs}ms."

if voiceover_enabled and not beats:
    WARN "Scene {i}: Has voiceover but no beats.
    Voice will play without visual sync points."
```

### Rule 3: Beat Density Check

```
for consecutive beat pairs:
    gap = beats[i+1].startMs - beats[i].startMs
    if gap < 500:
        WARN "Beats too close ({gap}ms apart). Minimum recommended: 500ms."
```

### Rule 4: Tail Breathing Room

```
if beats:
    tailRoom = sceneDurationMs - lastBeatMs
    if tailRoom < 300:
        WARN "Last beat ends {tailRoom}ms before scene ends. Recommend >= 500ms."
```

### Rule 5: Duration vs Content Density

```
if scene.type in ['bullet-slide', 'icon-grid', 'benefits']:
    minDuration = (itemCount * 2.5) + 1.5
    if scene.durationInSeconds < minDuration:
        WARN "{itemCount} items in {durationInSeconds}s may feel rushed.
        Minimum recommended: {minDuration}s."
```

## Runtime Guardrails (calculateMetadata.ts)

### Guardrail 1: Auto-calculate audioStartMs

```typescript
const registryEntry = sceneTimingRegistry[scene.type]
const visualReadyMs = registryEntry?.visualReadyMs ?? DEFAULT_VISUAL_READY_MS
const effectiveAudioStartMs = Math.max(visualReadyMs, timing?.audioStartMs ?? 0)
```

### Guardrail 2: Log when auto-adjusting

```typescript
if (timing?.audioStartMs && timing.audioStartMs < visualReadyMs) {
  console.warn(
    `[timing-sync] Scene ${i}: audioStartMs ${timing.audioStartMs}ms ` +
      `overridden to ${visualReadyMs}ms (visualReadyMs for ${scene.type})`,
  )
}
```

### Guardrail 3: Ignore leadInMs (deprecated)

```typescript
if (timing?.leadInMs && timing.leadInMs > 0) {
  console.warn(`[timing-sync] Scene ${i}: leadInMs ${timing.leadInMs}ms ignored. ` + `Phase 1 starts at frame 0.`)
}
```

### Guardrail 4: Duration auto-extends

```typescript
const totalMs = effectiveAudioStartMs + audioDurationMs + tailHoldMs
const sceneDuration = Math.max(scene.durationInSeconds, totalMs / 1000)
```

## Backward Compatibility

- **Zod schema:** `leadInMs` and `audioStartMs` remain as optional fields. Not removed — preserves existing config parsing. Effectively ignored by renderer.
- **Existing configs with timing fields:** Runtime guardrails auto-override. Re-rendered videos have better timing.
- **Existing configs without timing:** New default `audioStartMs = visualReadyMs` improves timing (~100-150ms voice delay instead of 0ms).
- **No migration script needed.** Old configs work better without changes.

## Change Inventory

| Layer               | Files                                                                               | Count         |
| ------------------- | ----------------------------------------------------------------------------------- | ------------- |
| New skill           | scene-timing-guide/SKILL.md                                                         | 1             |
| Modified prompts    | director, audio_planner, scene_creator, copywriter                                  | 4             |
| Modified skills     | scene-catalog, remotion-director, video-best-practices                              | 3             |
| New hooks           | usePhase1Entry.ts, useBeatReveal.ts                                                 | 2             |
| New registry        | sceneTimingRegistry.ts                                                              | 1             |
| Modified rendering  | calculateMetadata.ts, direction.ts, useScenePrecomputation.ts, CompositionShell.tsx | 4             |
| Refactored scenes   | All scene components (ClaudeCode + ProductShort + custom)                           | 22+           |
| Modified validation | validation.py (5 new rules)                                                         | 1             |
| **Total**           |                                                                                     | **~38 files** |
