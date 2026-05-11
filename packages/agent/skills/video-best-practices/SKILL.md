---
name: video-best-practices
description: Reglas de generacion de config.json para videos Remotion. Estructura de config, animacion (solo useCurrentFrame/spring/interpolate), voiceover, sound design, timing/beats y validacion. Usala al generar o modificar configs de video.
---

# Video Best Practices

Rules for generating valid, renderable Remotion video configs.

## Config structure

Two composition formats:

**Tutorial (landscape)**

```json
{
  "id": "kebab-case-id",
  "title": "Video title",
  "description": "One-line description",
  "fps": 30, "width": 1280, "height": 720,
  "theme": "linea-directa",
  "brief": {
    "platform": "linkedin",
    "audience": "...",
    "goal": "...",
    "promise": "...",
    "tone": "...",
    "cta": "...",
    "hookStrategy": "...",
    "templateId": "tutorial-code-walkthrough",
    "narrativeArc": ["promise", "demo", "takeaway"]
  },
  "scenes": [...]
}
```

**ProductShort (vertical)**

```json
{
  "id": "kebab-case-id",
  "composition": "ProductShort",
  "product": "Product name",
  "headline": "Marketing headline",
  "theme": "linea-directa",
  "fps": 30, "width": 1080, "height": 1920,
  "brief": {
    "platform": "shorts",
    "audience": "...",
    "goal": "...",
    "promise": "...",
    "tone": "...",
    "cta": "...",
    "hookStrategy": "...",
    "templateId": "product-short-offer",
    "narrativeArc": ["offer hook", "benefits", "cta"]
  },
  "scenes": [...]
}
```

## Narrative templates

- Always choose a `templateId` from the `scene-catalog` templates before writing scenes.
- Store `brief.templateId` and `brief.narrativeArc` in the config.
- Use template steps as the first escaleta draft; deviations are allowed only when the user's request or research brief demands it.
- Every scene should serve one dominant narrative role: hook, problem, demo, proof, transition, takeaway, summary, or CTA.

## Animation rules

- All animations MUST use `useCurrentFrame()` + `spring()` / `interpolate()`
- CSS transitions, CSS animations, and Tailwind animation classes are FORBIDDEN — Remotion renders frame-by-frame, CSS animations produce blank frames
- `spring()` for organic motion (entry, bounce, scale)
- `interpolate()` for linear progress (wipes, countdowns, progress bars)

## Scenes

- Scenes render sequentially via `<Series>` — no overlapping
- Scene duration = `durationInSeconds * fps` frames
- Every scene MUST have `"durationInSeconds"` — never use `durationInFrames` or `duration`

## Direction fields (timing + beats)

Optional on all scenes. Added by the director agent, not the copywriter.

**Timing** controls when motion/audio starts within a scene:

- `leadInMs` — delay before motion starts
- `audioStartMs` — delay before narration starts
- `tailHoldMs` — hold last frame before transition
- `transitionMs` — cross-fade duration (0 = hard cut)

**Beats** are narration/visual cue points within a scene:

- Required: `id` (string), `startMs` (number >= 0)
- Optional: `endMs`, `narration`, `visual`, `animation`, `emphasis`
- `startMs`/`endMs` are relative to scene start, not video start

## Voiceover

- `voiceover.scenes` maps scene indices to narration text
- MP3 files go in `public/voiceover/{config_id}/`
- File naming: `{sceneIndex}.mp3`
- ALWAYS include `"enabled": true` when voiceover has scenes (Zod schema requires it)
- Provider is always `gemini` (ElevenLabs not available)

## Sound design

- `soundDesign.musicBed.libraryId` must match an MP3 stem in `public/audio/library/`
- SFX entries need `id`, `sceneIndex`, `triggerMs`, `libraryId`
- Audio files go in `public/audio/{config_id}/`
- Only use tracks returned by `list_audio_library` — API generation is disabled

## Volume reference

| Element             | Level  |
| ------------------- | ------ |
| Music bed (normal)  | -18 dB |
| Music bed (ducking) | -26 dB |
| Keyboard ASMR       | -14 dB |
| Chimes/clicks       | -15 dB |
| Swoosh              | -16 dB |
| Stinger             | -10 dB |

## Themes

- Default is `"linea-directa"` — never use `"default"` unless explicitly requested
- Available: `"default"` (dark/green), `"linea-directa"` (white/red), `"atom-dark"` (dark/blue)
- Access tokens via `useThemeTokens()` hook — never check theme name directly

## Validation

Run `validate_config` after generating or modifying config.json to check:

- Scene types against built-in types and custom registry
- Voiceover MP3 existence
- Music bed and SFX library ID existence
