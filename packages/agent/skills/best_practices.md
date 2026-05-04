# Remotion Best Practices

Rules for generating valid, renderable video configs.

## Animation

- All animations MUST use `useCurrentFrame()` + `spring()`/`interpolate()`.
- CSS transitions, CSS animations, and Tailwind animation classes are forbidden (Remotion renders frame-by-frame).
- Use `spring()` for organic motion (entry, bounce, scale). Use `interpolate()` for linear progress (wipes, countdowns, progress bars).

## Config structure

- `config.json` is the source of truth. Never hardcode values in components.
- Every scene must have `type` and `durationInSeconds`.
- `fps` is always `30`.
- Tutorial: 1280x720, ProductShort: 1080x1920.

## Scenes

- Scenes render sequentially via `<Series>`. No overlapping.
- Scene duration = `durationInSeconds * fps` frames.
- Direction fields (`timing`, `beats`) are optional on all scenes.
- `timing.leadInMs` delays motion start. `timing.audioStartMs` delays narration start. `timing.tailHoldMs` holds the last frame. `timing.transitionMs` controls cross-fade.

## Beats

- Beats are narration/visual cue points within a scene.
- Required fields: `id` (string), `startMs` (number >= 0).
- Optional fields: `endMs`, `narration`, `visual`, `animation`, `emphasis`.
- Beat `startMs`/`endMs` are relative to the scene start, not the video start.

## Voiceover

- `voiceover.scenes` maps scene indices to narration text.
- The voice_generator agent produces MP3 files in `public/voiceover/{config_id}/`.
- File naming: `{sceneIndex}.mp3`.
- Always include `"enabled": true` when voiceover has scenes.

## Sound design

- `soundDesign.musicBed.libraryId` must match an MP3 stem in `public/audio/library/`.
- SFX entries need `id`, `sceneIndex`, `triggerMs`, `libraryId`.
- The sound_engineer agent copies files to `public/audio/{config_id}/`.

## Themes

- Default theme is `"linea-directa"`. Never use `"default"` unless explicitly requested.
- Access design tokens via `useThemeTokens()` hook. Never check theme name directly.
- Available themes: `"default"` (dark/green), `"linea-directa"` (white/red #CC3333), `"atom-dark"` (dark/blue).

## Custom scenes

- Custom scenes use `type: "custom"` with a `componentId` matching `customSceneRegistry.ts`.
- All custom components must be statically imported — no dynamic imports.
- Pass arbitrary props via the `props` object.

## Validation

- Run `validate_config` after generating or modifying config.json.
- Check scene types against `BUILTIN_SCENE_TYPES` and custom registry.
- Verify voiceover MP3s exist before rendering.
- Verify music bed and SFX library IDs exist before rendering.
