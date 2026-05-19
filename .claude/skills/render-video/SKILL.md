---
name: render-video
description: Validate and render a Remotion video from a config.json to MP4. Use this skill when the user wants to render a video, test a config, preview a render, check if a config is valid, or re-render after changes. Trigger on phrases like "render", "renderiza", "genera el video", "prueba el config", or any mention of running the render pipeline locally (not through Docker — that's the agent pipeline). Also use when the user names a specific content slug and wants to see the output.
---

# Render Video

Render a Remotion video from a config.json file. This runs the local render pipeline (Zod validation → Remotion bundling → frame-by-frame React rendering → MP4 encoding), not the Docker agent pipeline.

The render script lives at `scripts/render.ts` and supports two compositions: `ClaudeCodeTutorial` (1280x720 landscape) and `ProductShort` (1080x1920 vertical). It auto-detects which schema to use from the `composition` field in the config.

## Finding the config

Content is organized under `content/{type}/{slug}/config.json` where type is `tutorials`, `presentations`, or `shorts`.

```bash
# If the user gave a slug, try the common locations
ls content/tutorials/${SLUG}/config.json content/presentations/${SLUG}/config.json content/shorts/${SLUG}/config.json 2>/dev/null
```

If nothing matches, search:

```bash
find content -name "config.json" -path "*${SLUG}*"
```

## Validate first

Always validate before rendering — a failed render wastes minutes of CPU time, while validation takes milliseconds and catches the same Zod errors.

```bash
pnpm exec tsx scripts/validate-config.ts <path-to-config.json>
```

The output is JSON: `{"valid": true}` or `{"valid": false, "errors": [...]}`. Fix any errors before proceeding. Common issues:

- Missing `composition` field (defaults to ClaudeCodeTutorial but may cause warnings)
- Scene type mismatches — check that custom component props match their registered interfaces
- Invalid audio references — voiceover/soundDesign paths that don't exist yet

## Render

```bash
pnpm exec remotion browser ensure  # downloads Chromium if missing (~first run only)
pnpm exec tsx scripts/render.ts <path-to-config.json>
```

The render bundles the React app with Webpack (including Tailwind), calculates total duration from scene timings, and renders frame-by-frame. Typical times:

- 10 scenes, ~2 min video → 60-120s render
- Short (30s) → 15-30s render

The output MP4 lands next to the config: `content/{type}/{slug}/output.mp4`

## After render

Report these stats:

- **File size**: `ls -lh content/{type}/{slug}/output.mp4`
- **Duration and scene count**: read from the config.json (sum of scene durations in frames ÷ 30fps)
- **Warnings**: any validation warnings or render stderr

If on macOS, offer to open the video:

```bash
open content/{type}/{slug}/output.mp4
```

## Troubleshooting

| Symptom                       | Likely cause                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `Cannot find browser`         | Run `pnpm exec remotion browser ensure`                                                    |
| Zod validation error          | Config doesn't match schema — check `src/compositions/ClaudeCodeTutorial/schema.ts`        |
| Blank/white scenes            | Missing text props or voiceover timing mismatch                                            |
| TypeError in custom component | LLM generated wrong prop shape — check `customSceneRegistry.ts` for expected interface     |
| Render hangs                  | Usually a React infinite loop in a scene component — check which scene index it's stuck on |
