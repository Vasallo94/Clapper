# Sound Engineer Skill & Audio Pipeline Design

**Date**: 2026-03-28
**Status**: Draft
**Author**: Enrique + Claude

## Context

The Remotion video pipeline currently handles only voiceover (TTS via ElevenLabs/Gemini). Videos lack ambient music, sound effects, and audio layering — they feel "dry." ElevenLabs offers three relevant APIs beyond TTS: Sound Effects V2 (text-to-SFX, 0.5-30s, loops), Music API (text-to-music, 3s-5min, royalty-free), and Voice Library (search/filter voices).

The goal is a fully automated agent pipeline where the human validates creative decisions but never performs technical work. The sound-engineer skill is the final creative step before render.

## Principles

1. **Automate execution, not criteria** — Skills propose; the human approves. The sound-engineer presents a "sound card" (carta de sonido) via `AskUserQuestion` and iterates until approved. Same pattern as the tutorial-generator escaleta.
2. **Agent pipeline** — Full chain: `tutorial-generator → director → sound-engineer → render`. No manual steps.
3. **Transitions as narrative tool** — Silences between scenes are intentional: the director designs them, the music fills them, the ear perceives structure.
4. **Generous defaults, easy removal** — SFX auto-mapped by scene type. User disables what doesn't work rather than specifying everything.

## Architecture: Skill + Script (Approach C)

Three new pieces:

| Piece                             | Role                                | Analogy in current system            |
| --------------------------------- | ----------------------------------- | ------------------------------------ |
| `sound-engineer` skill            | Decides WHAT audio to generate      | `remotion-tutorial-generator` skill  |
| `generate-sound-design.ts` script | Calls APIs, generates files         | `generate-voiceover.ts` script       |
| `audioMix.ts` util                | Renders audio layers in composition | Existing `<Audio>` voiceover pattern |

Plus a cross-cutting update: **director v2** becomes music-aware.

## 1. Schema — `SoundDesignSchema` in `direction.ts`

Added at the same level as `VoiceoverConfigSchema`:

```typescript
SoundLibraryEntrySchema = z.object({
  id: z.string(), // "lofi-tech", "corporate-warm"
  prompt: z.string(), // Prompt used to generate the track
  file: z.string(), // Relative path in public/audio/library/
  durationMs: z.number(),
  tags: z.array(z.string()), // ["calm", "tech", "minimal"]
})

SfxEntrySchema = z.object({
  id: z.string(), // "keyboard-typing", "ui-chime"
  prompt: z.string(), // Prompt for SFX API
  durationMs: z.number().optional(), // 0.5-30s, auto if not given
  loop: z.boolean().default(false),
  volume: z.number().default(-12), // dB relative
  trigger: z.enum(["scene-start", "beat", "typewriter", "reveal", "transition", "accent-line"]),
  sceneTypes: z.array(z.string()).optional(),
  beatEmphasis: z.enum(["low", "medium", "high"]).optional(),
})

SoundDesignSchema = z.object({
  enabled: z.boolean().default(false),
  musicBed: z
    .object({
      libraryId: z.string().optional(), // Reference to existing loop
      customPrompt: z.string().optional(), // Or generate a new one
      volume: z.number().default(-18), // dB base (no ducking)
      duckingVolume: z.number().default(-26), // dB when voice active
      fadeInMs: z.number().default(2000),
      fadeOutMs: z.number().default(3000),
      duckingFadeMs: z.number().default(400), // Duck/unduck speed
    })
    .optional(),
  sfx: z.array(SfxEntrySchema).default([]),
  sceneOverrides: z
    .record(
      z.string(),
      z.object({
        disableSfx: z.array(z.string()).optional(),
        extraSfx: z.array(SfxEntrySchema).optional(),
      }),
    )
    .optional(),
})
```

**In config.json** `soundDesign` sits alongside `voiceover`:

```json
{
  "voiceover": { ... },
  "soundDesign": {
    "enabled": true,
    "musicBed": { "libraryId": "lofi-tech", "volume": -18 },
    "sfx": [
      { "id": "keyboard", "prompt": "soft mechanical keyboard typing...", "trigger": "typewriter", "sceneTypes": ["terminal"], "loop": true },
      { "id": "ui-chime", "prompt": "gentle digital chime...", "trigger": "reveal", "sceneTypes": ["custom"] }
    ]
  }
}
```

### Timing field: `transitionMs`

Added to `TimingSchema` in direction.ts:

```typescript
transitionMs: z.number().optional() // Silence gap before this scene (0-1500ms)
```

The director sets this per scene. The sound-engineer reads it to calculate ducking curves. Longer transitions before high-impact scenes (reveals, diagrams); shorter between scenes continuing the same thread.

## 2. Script — `scripts/generate-sound-design.ts`

Same pattern as `generate-voiceover.ts`: read config, generate files, cache with fingerprint.

### Responsibilities

1. Read `config.soundDesign`
2. For each SFX entry: call ElevenLabs SFX API (`POST /v1/text-to-sound-effects/convert`) with prompt, duration_seconds, loop flag
3. For musicBed: if `libraryId` → check `public/audio/library/{id}.mp3` exists; if `customPrompt` → call Music API (`POST /v1/music/compose`)
4. Save to `public/audio/{config.id}/`
5. Fingerprinting: hash of (prompt + durationMs + loop) → `fingerprints.json`, only regenerate if changed

### File structure

```
public/audio/
  library/                        # Reusable loops (committed to git)
    lofi-tech.mp3
    corporate-warm.mp3
    minimal-ambient.mp3
  claude-code-memory/             # Video-specific SFX (gitignored like output.mp4)
    music-bed.mp3
    sfx-keyboard.mp3
    sfx-ui-chime.mp3
    sfx-accent-swoosh.mp3
    fingerprints.json
```

### Integration in render.ts

```typescript
// After generate-voiceover, before bundle
if (config.soundDesign?.enabled) {
  execFileSync("npx", ["tsx", "scripts/generate-sound-design.ts", configPath])
}
```

### API calls

**SFX API:**

```typescript
POST https://api.elevenlabs.io/v1/text-to-sound-effects/convert
{
  text: sfx.prompt,
  duration_seconds: sfx.durationMs ? sfx.durationMs / 1000 : undefined,
  loop: sfx.loop,
  output_format: "mp3_44100_128"
}
```

**Music API:**

```typescript
POST https://api.elevenlabs.io/v1/music/compose
{
  prompt: musicBed.customPrompt,
  duration_seconds: totalVideoDurationSeconds + 5,  // Buffer for fades
  mode: "instrumental",
  loudness: -14,
  quality: "high"
}
```

### Retry & rate limiting

Same pattern as voiceover: 3 retries, exponential backoff (15s, 30s, 45s) on 429 status.

## 3. Compositions — Audio layers with dynamic ducking

### New util: `src/utils/audioMix.ts`

Pure functions for audio rendering:

```typescript
// Convert dB to linear gain (0-1)
export function dbToLinear(db: number): number

// Compute music volume at a given frame, considering ducking
export function computeMusicVolume(
  frame: number,
  config: VideoConfig,
  fps: number,
  audioDurations: Map<number, number>, // scene index → voiceover duration in ms
): number

// Get SFX entries that apply to a scene
export function getSceneSfxEntries(sceneIndex: number, sceneType: string, soundDesign: SoundDesign): SfxEntry[]

// Calculate the frame where an SFX should trigger
export function sfxTriggerFrame(sfx: SfxEntry, scene: Scene, sceneStartFrame: number, fps: number): number

// Calculate the frame where a looping SFX should stop
export function sfxEndFrame(sfx: SfxEntry, scene: Scene, sceneStartFrame: number, fps: number): number
```

### `computeMusicVolume` logic

For each frame:

1. Determine which scene is active and whether voiceover is playing (using audioStartMs + measured MP3 duration)
2. If in a `transitionMs` gap between scenes: ramp UP to `musicBed.volume` (music breathes)
3. If voiceover is active: ramp DOWN to `musicBed.duckingVolume`
4. If voiceover is silent within a scene (between beats, pauses designed by director): ramp UP partially
5. Apply global fadeIn at video start, fadeOut at video end
6. All ramps use `duckingFadeMs` for smooth transitions

The function is deterministic (pure function of frame + config + durations), so Remotion can call it per-frame without side effects.

### Composition changes (ClaudeCodeTutorial.tsx / ProductShort.tsx)

**Music bed** — single `<Audio>` at composition root, outside `<Series>`:

```tsx
{
  config.soundDesign?.enabled && config.soundDesign.musicBed && (
    <Audio
      src={staticFile(`audio/${config.id}/music-bed.mp3`)}
      volume={(f) => computeMusicVolume(f, config, fps, audioDurations)}
      loop
    />
  )
}
```

**SFX** — per-scene, inside each `<Series.Sequence>`:

```tsx
{
  sceneSfxEntries.map((sfx) => (
    <Sequence from={sfxTriggerFrame(sfx, scene, sceneStart, fps)} key={sfx.id}>
      <Audio
        src={staticFile(`audio/${config.id}/sfx-${sfx.id}.mp3`)}
        volume={dbToLinear(sfx.volume)}
        loop={sfx.loop}
        endAt={sfx.loop ? sfxEndFrame(sfx, scene, sceneStart, fps) : undefined}
      />
    </Sequence>
  ))
}
```

### SFX trigger mapping

| Trigger       | Frame calculation                                             |
| ------------- | ------------------------------------------------------------- |
| `scene-start` | `motionStartFrame`                                            |
| `typewriter`  | Frame of first `kind: "command"` line in TerminalScene        |
| `reveal`      | Frame of the beat with matching emphasis                      |
| `accent-line` | `accentStart` frame (IntroScene)                              |
| `beat`        | Each beat with emphasis >= `sfx.beatEmphasis`                 |
| `transition`  | Frame 0 of the scene (before leadIn, during transitionMs gap) |

## 4. Skill — `sound-engineer`

### Invocation

`/sound-engineer` — runs on an existing config.json that already has scenes, voiceover, and direction (beats/timing).

### Workflow (5 steps)

**Step 1 — Analysis:**

- Read config: brief (tone, platform, audience), scenes by type, beats with emphasis, total duration
- Detect re-run vs first time (existing `soundDesign` section?)

**Step 2 — Music bed proposal:**

- Scan `public/audio/library/` for existing loops
- Match by brief tone/tags: "personal-didactic" → lofi-tech, "corporate" → corporate-warm
- Propose 2-3 options to user, with recommendation
- If none fit, propose a custom prompt for Music API
- **Present to user via `AskUserQuestion`** — user picks one

**Step 3 — Sound card (carta de sonido):**

- Apply default SFX mapping by scene type:
  - `terminal` → keyboard typing (loop), click on Claude response
  - `intro` → accent swoosh on accent line
  - `custom/block-diagram` → chime on block reveal
  - `custom/flow-diagram` → whoosh on orb travel
  - `custom/file-explorer` → folder click on file expand
  - `callout` → subtle attention tone
  - `outro` → musical stinger (close)
  - Scene transitions → transition swoosh/fade
- Adjust density based on brief tone (corporate → fewer SFX, personal → more ASMR)
- Present scene-by-scene table to user:

```
CARTA DE SONIDO — "El dia que Claude recordo mis telescopios"

Music bed: lofi-tech (loop, -18dB, duck a -26dB durante voz)

Escena 0 (intro, 5s):     swoosh en linea de acento [1650ms]
Escena 1 (terminal, 12s): teclado mecanico durante typing [loop], click suave en respuesta Claude
Escena 2 (file-explorer):  click carpeta al expandir archivo
Escena 3 (block-diagram):  chime al revelar cada bloque [x3]
Escena 4 (callout):        tono atencion sutil
Escena 5 (block-diagram):  chime al revelar cada bloque [x4]
Escena 6 (file-explorer):  click carpeta al expandir
Escena 7 (flow-diagram):   whoosh del orb entre nodos [x3]
Escena 8 (outro):          stinger musical de cierre

Ducking: -26dB durante voz, fade 400ms
Transiciones: 600ms entre escenas normales, 1000ms antes de reveals
```

- **Present via `AskUserQuestion`** — iterate until approved (no round limit)

**Step 4 — Write config:**

- Write `soundDesign` section to config.json with all SFX entries, prompts, and music bed selection

**Step 5 — Generate audio:**

- Execute `scripts/generate-sound-design.ts`
- Report files generated and estimated API cost

### Does NOT render — that's render.ts's job in the pipeline.

## 5. Director v2 — Music-aware direction

### New rules added to `remotion-director` skill

1. **Narrative pauses**: If `soundDesign.enabled`, ensure at least one voiceover silence of 800ms+ every 15-20 seconds. This is where music "breathes" and the viewer processes information.

2. **Transition timing**: Assign `transitionMs` per scene in timing:
   - 0ms: hard cut (rare, high energy)
   - 300-600ms: standard transition (same narrative thread)
   - 800-1200ms: breathing pause (before reveal or topic change)
   - 1200-1500ms: dramatic pause (before climax or key insight)

3. **Beat gap awareness**: When writing beats, leave intentional gaps (200-400ms) between consecutive narrated beats where music can be heard. Not every millisecond needs narration.

4. **Transition as narrative**: The silence between scenes is a storytelling tool. A long pause before "Y ahi entendi que el sistema tiene tres capas" builds anticipation. The music rises during the pause, then ducks when the voice returns.

### Implementation

Add these as rules in the director skill SKILL.md. No code changes — the director already writes timing/beats, it just gains new heuristics for when `soundDesign` will be present.

## 6. Project governance updates

### CLAUDE.md additions

Under "Project intention":

> Pipeline **fully automated by AI agents**. The human validates creative decisions (escaleta, sound card) but never performs technical execution. Agent chain: `tutorial-generator → director → sound-engineer → render`.

### AGENTS.md additions

New principle:

> **Automate execution, not criteria.** Skills propose creative decisions via `AskUserQuestion` and iterate until the human approves. Technical work (API calls, file generation, rendering) is fully automated. The human never touches config.json manually.

## Verification

### End-to-end test

1. Run `/sound-engineer` on `tutorials/claude-code-memory/config.json`
2. Verify sound card presented to user with music + SFX proposal
3. After approval, verify `soundDesign` section written to config
4. Run `scripts/generate-sound-design.ts` — verify MP3 files in `public/audio/claude-code-memory/`
5. Run `scripts/render.ts` — verify output.mp4 has:
   - Background music audible in silences/transitions
   - Music ducks when voiceover plays
   - Keyboard sounds during terminal typing
   - Chimes on block reveals
   - No audio clipping or volume spikes

### Unit checks

- `dbToLinear(-18)` ≈ 0.126
- `computeMusicVolume` returns higher value during `transitionMs` gaps
- `getSceneSfxEntries` correctly filters by sceneType and applies overrides
- Fingerprint cache prevents unnecessary API calls on re-run

### TypeScript

- `npx tsc --noEmit` passes
- All new schemas validate against existing config structure
