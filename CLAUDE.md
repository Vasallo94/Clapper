# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                # Remotion Studio (preview in browser)
npm run build              # Bundle composition
npm run lint               # ESLint + TypeScript check

# Render a tutorial to MP4
npx tsx scripts/render.ts tutorials/[slug]/config.json

# If Chromium missing
npx remotion browser ensure
```

## Architecture

Remotion-based video pipeline that generates Claude Code tutorial videos from JSON configs.

**Data flow:** `config.json` → Zod validation → React composition → frame-by-frame render → MP4

### Composition system

`src/Root.tsx` registers `ClaudeCodeTutorial` as the main composition. It reads a `config.json` as props, calculates total duration from scene durations (`calculateMetadata.ts`), and renders scenes sequentially via `<Series>`.

Five scene types defined in `schema.ts`: `intro`, `terminal`, `callout`, `outro`, `custom`. Each has a matching React component in `scenes/`.

### Terminal animation timing

`TerminalScene` builds a timing map where each line has `startFrame` + `durationFrames`:
- `command`: typed char-by-char (2 chars/frame)
- `claude`: streaming effect (3 chars/frame, 12-frame gap)
- `output`: instant reveal (4 frames)
- `blank`: spacer
- `delayAfterMs` on any line adds pause before it appears

### Theme system

`ThemeContext` provides `"default"` (dark, green accents) or `"linea-directa"` (white, red #CC3333, pixel phone mascot). Scene components read theme via `useTheme()` hook and branch styling.

### Custom scene extension

`customSceneRegistry.ts` maps `componentId` strings to React components. All custom components must be statically imported and registered here — Remotion bundles at compile time, no dynamic imports.

## Critical constraints

- **All animations must use `useCurrentFrame()` + `spring()`/`interpolate()`**. CSS transitions and Tailwind animation classes are forbidden (Remotion renders frame-by-frame, CSS animations don't work).
- **`config.json` is the source of truth.** To adjust a tutorial, edit the JSON and re-render.
- **`tutorials/*/output.mp4` is gitignored.** Config files are committed, rendered videos are not.
- **Render script uses `@remotion/bundler` with Tailwind webpack override** — `remotion.config.ts` does NOT apply to the Node.js render API, the override is passed manually in `scripts/render.ts`.

## Code style

- Prettier: 2-space indent, no semicolons, bracket spacing
- ESLint: `@remotion/eslint-config-flat`
- TypeScript strict mode, `noUnusedLocals: true`
