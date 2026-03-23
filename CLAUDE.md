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

`src/Root.tsx` registers two compositions: `ClaudeCodeTutorial` (1280×720 landscape) and `ProductShort` (1080×1920 vertical). Each reads a `config.json` as props, calculates total duration via `createCalculateMetadata<T>()` from `src/utils/calculateMetadata.ts`, and renders scenes sequentially via `<Series>`.

Scene types are defined in each composition's `schema.ts`. Named prop types are exported directly (`IntroSceneProps`, `TerminalSceneProps`, etc.) — scene components import these instead of using `Extract<...>`.

### Terminal animation timing

`TerminalScene` simulates a Claude Code CLI session. It renders user messages in bordered boxes ("You" label), Claude responses with orange "⏵ Claude" label, and tool outputs with orange left border. A status bar at the bottom shows model name, animated context bar, and cost. All colors come from `tokens.terminal.*`.

Timing map — each line has `startFrame` + `durationFrames`:
- `command`: typewriter effect (0.5 chars/frame)
- `claude`: streaming effect (1 char/frame, 18-frame gap between lines)
- `output`: instant reveal (8 frames)
- `blank`: spacer
- `delayAfterMs` on any line adds pause before it appears

### Theme system

`ThemeContext` provides `"default"` (dark, green accents) or `"linea-directa"` (white bg, red #CC3333, PhoneMascot SVG). All design tokens are centralized in `themes.ts` via `ThemeTokens` type. Scene components read tokens via `useThemeTokens()` hook — never check theme name directly.

Key token groups:
- **terminal.\***: sceneBackground, bg, command, output, claude, labelColor, successColor, statusBarBg, borderColor, separatorColor, costColor, userMessageBg, userMessageBorder
- **mascot.\***: show, cornerScale, cornerOpacity, cornerBottom, cornerRight
- **card.\***: bg, bgGradient, border, accentBorder, shadow
- **Top-level**: primary, secondary, fontFamily, monoFontFamily, labelColor, accentLine, overlay

### PhoneMascot

`components/PhoneMascot.tsx` — SVG mascot faithful to the real Línea Directa logo (button phone with 3×3 keypad, handset, cable, 4 wheels). Props: `scale`, `animation` (`"none"` | `"idle"` | `"ring"` | `"entry"` | `"dial"`), `darkBg` (uses light outlines for dark backgrounds). Entry animation chains roll-in → handset lift → idle breathing.

`components/MascotWatermark.tsx` — wrapper for the bottom-right corner mascot pattern. Reads positioning from `tokens.mascot.*`, only renders when `tokens.mascot.show` is true. Used in TerminalScene (dial), CalloutScene (idle), OutroScene (idle).

### Shared hooks

`hooks/useSlideIn.ts` — `useSlideIn({ distance?, delay?, durationInFrames?, damping? })` returns `{ opacity, y, spring }`. Replaces the repeated spring+interpolate "enter from below" pattern used across scenes.

### Custom scene extension

`customSceneRegistry.ts` maps `componentId` strings to React components. All custom components must be statically imported and registered here — Remotion bundles at compile time, no dynamic imports.

## Critical constraints

- **All animations must use `useCurrentFrame()` + `spring()`/`interpolate()`**. CSS transitions and Tailwind animation classes are forbidden (Remotion renders frame-by-frame, CSS animations don't work).
- **`config.json` is the source of truth.** To adjust a tutorial, edit the JSON and re-render.
- **`tutorials/*/output.mp4` is gitignored.** Config files are committed, rendered videos are not.
- **Render script uses `@remotion/bundler` with Tailwind webpack override** — `remotion.config.ts` does NOT apply to the Node.js render API, the override is passed manually in `scripts/render.ts`.
- **Never check theme name directly in scenes.** Use `useThemeTokens()` and read token values. The `isLD` / `useTheme()` pattern is deprecated.
- **Scene prop types are exported from `schema.ts`.** Import `IntroSceneProps` etc. directly — don't use `Extract<z.infer<...>>`.

## Code style

- Prettier: 2-space indent, no semicolons, bracket spacing
- ESLint: `@remotion/eslint-config-flat`
- TypeScript strict mode, `noUnusedLocals: true`
