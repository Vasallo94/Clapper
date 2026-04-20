# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Monorepo directory scaffold: `packages/render-service/`, `packages/agent/`, `packages/web/` with placeholder `.gitkeep` files
- `scripts/validate-config.ts` — CLI validation tool that parses a config JSON against `TutorialConfigSchema` or `ProductShortConfigSchema` and exits with code 0 (valid) or 1 (invalid)
- Render service Express bridge (`packages/render-service/`) with 4 HTTP endpoints: `/api/validate` (Zod schema validation), `/api/render` (async job submission), `/api/render/:id/status` (progress tracking), `/api/audio/library` (music track listing)

### Fixed

- `ProblemSolutionScene`, `BeforeAfterScene`: replaced hardcoded `#ff5050`/`#50ff78` colors with `tokens.terminal.labelColor`/`tokens.terminal.successColor`
- `ApiRequestScene`: replaced hardcoded panel background, Request/Response label colors, and status color with theme tokens (`tokens.terminal.bg`, `tokens.terminal.successColor`, `tokens.terminal.claude`, `tokens.primary`)
- `BrowserMockupScene`: replaced hardcoded chrome bar, traffic light dots, and URL bar colors with `tokens.terminal.titleBar`, `tokens.terminal.dots[*]`, and `tokens.terminal.bg`
- `CountdownScene`: fixed beat index collision — boxes now stagger correctly when beats are provided (`boxesStartFrame + i * step` instead of `beats[1] + i * step` overwriting per-item with same value)
- `BarChartScene`: added missing `<MascotWatermark animation="idle" />` for theme consistency

### Added

- 4 presentation scene components: `MediaCardScene`, `LogoWallScene`, `TwoColumnTextScene`, `StepListScene`
- 4 demo/technical scene components: `BrowserMockupScene`, `ApiRequestScene`, `CodeDiffScene`, `AnnotatedImageScene`
- 7 custom scene components for animated presentations: `CodeBlockScene`, `SplitScreenScene`, `IconGridScene`, `BigNumberScene`, `ComparisonTableScene`, `SectionTitleScene`, `BulletSlideScene`
- 13 SVG icon components in `svg-icons.tsx`: CheckIcon, CrossIcon, TerminalIcon, CloudIcon, CodeIcon, ShieldIcon, GearIcon, UserIcon, BookIcon, LightbulbIcon, ArrowRightIcon, LayersIcon, LinkIcon
- Vertex AI service account auth for Gemini TTS (`GOOGLE_APPLICATION_CREDENTIALS`)
- `findFfmpeg()` helper in `generate-voiceover.ts` — auto-discovers Remotion's bundled ffmpeg
- Gemini 3.1 Flash TTS Preview model support (`gemini-3.1-flash-tts-preview`)
- Tutorial `skills-claude-code` (14 scenes, ~97s): Skills de Claude Code para desarrolladores LDA
- `.gitignore` patterns for service account key files

### Changed

- `generate-voiceover.ts`: dual auth (Vertex AI service account + API key), upgraded TTS model
- `render.ts`: added `shell: true` to child process calls for Windows compatibility

- Theme `atom-dark` (One Dark Pro palette) for personal videos
- 3 custom scene components: `BlockDiagramScene`, `FileExplorerScene`, `FlowDiagramScene`
- SVG icon components (`svg-icons.tsx`) replacing emoji characters
- Terminal auto-scroll with fixed height container
- Fade-in + slide entry animation on terminal messages
- SVG triangle for Claude label (replacing unicode character)
- Enterprise bootstrap: husky, lint-staged, commitlint, ADRs, specs structure
- Gemini 2.5 Flash TTS voiceover integration (`scripts/generate-voiceover.ts`)
- `<Audio>` component in ClaudeCodeTutorial for per-scene voiceover playback
- Voiceover auto-generation step in render pipeline (`scripts/render.ts`)
- Schema fields `provider` and `language` in voiceover config
- Spanish narration for claude-code-memory tutorial (9 scenes, voice: Orus)
- Custom Claude Code hooks: config validator, render reminder, voiceover cost tracker
- Editorial direction model (`src/utils/direction.ts`): Brief, Timing, Beats, VoiceoverConfig schemas
- `remotion-director` skill for refining timing/beats on existing configs
- Pixel logo pipeline: `generate-pixel-logo.ts`, PixelLogo component, PixelLogoPreview composition
- Dual TTS support (Gemini + ElevenLabs) with per-scene overrides in `generate-voiceover.ts`
- Dynamic scene duration from measured audio length in `calculateMetadata.ts`
- Beat-driven animation timing across all scene components
- ADR 0001 (pixel logo pipeline) and ADR 0002 (editorial direction model)
- Tutorial claude-code-memory V2 with narrative brief, beats, and pixel logo
- Sound design pipeline: `scripts/generate-sound-design.ts` with ElevenLabs SFX V2 + Music API
- `src/utils/audioMix.ts` — ducking, SFX trigger/end frame, volume utilities
- Music bed `<Audio>` with dynamic ducking in ClaudeCodeTutorial and ProductShort compositions
- Per-scene SFX `<Audio>` with trigger-type mapping (scene-start, beat, typewriter, reveal, transition, accent-line)
- `SoundDesignSchema`, `SfxEntrySchema`, `MusicBedSchema` in direction.ts
- `transitionMs` field in TimingSchema for scene transition silence gaps
- `sound-engineer` skill — 5-step workflow for automated sound design with human approval gates
- Music-aware rules in `remotion-director` skill (narrative pauses, transition heuristics, beat gaps)
- Agent pipeline principle in CLAUDE.md and AGENTS.md: automate execution, not criteria
- Karaoke subtitles: word-by-word synchronized captions via ElevenLabs `/with-timestamps` endpoint
- `KaraokeSubtitles` component with chunked word display and highlight animation
- `SubtitlesConfigSchema` in `schema.ts` (enabled, style, fontSize, position)
- `LogoWatermark` component: PixelLogo with procedural smoke particles for non-mascot themes
- `SmokeParticles` component: deterministic particle system using seeded PRNG
- Seamless music loop (`lofi-tech-2-loop.mp3`) via ffmpeg crossfade

### Changed

- LogoWatermark now renders per-scene (inside Series.Sequence) and is hidden during intro scenes
- Voiceover text uses literal `.md` and `/command` instead of spelled-out "punto md" / "barra command" so subtitles display correctly
- Voiceover script now uses ElevenLabs `/with-timestamps` endpoint, saves word-level `.timestamps.json` per scene
- Music bed no longer requires `loop` — crossfaded track is longer than video duration
- Voice changed to David Martin (Calm) `y6WtESLj18d0diFRruBs` for Spanish peninsular narration
- SFX reduced to keyboard + new epic cinematic intro braam

- Font sizes increased across all scenes for mobile readability
- Prettier config completed (semi: false, printWidth: 120, trailingComma, arrowParens)
- All scene schemas merged with `DirectionSceneFieldsSchema` (timing + beats fields)
- Skills `remotion-tutorial-generator` and `remotion-short-ld` updated with editorial brief step

### Fixed

- FlowDiagramScene orb animation rewritten with per-node cycle system
- Terminal content overflow with estimateLineHeight() scroll calculation
- FlowDiagramScene: fixed broken indentation in arrow generation, removed IIFE pattern, fixed `frame` vs `localFrame` bug in outro
- BlockDiagramScene: fixed beat-to-block mapping (beat[0] is title, not first block) and connection timing (now appears after all blocks with stagger)

## 2026-03-23

### ProductShort — Composición vertical para marketing

- Nueva composición `ProductShort` (1080×1920, 9:16) con 4 escenas: `hero`, `benefits`, `pricing`, `cta`
- Skill `/short-ld` para generar shorts de marketing de Línea Directa automaticamente
- `render.ts` soporta campo `composition` en el config (backwards compatible)
- Smoke test: `shorts/seguro-coche-demo/config.json`
- README reescrito como plataforma multi-composición

### PhoneMascot SVG y TerminalScene redesign

- `PixelPhoneMascot` reemplazada por `PhoneMascot` SVG fiel al logo real de Línea Directa (teléfono con ruedas, auricular, cable, teclado 3×3)
- Prop `darkBg` para outlines blancos sobre fondos oscuros (terminal)
- `TerminalScene` rediseñada para simular la CLI real de Claude Code: cajas "You", etiqueta "⏵ Claude", barra de estado con modelo/contexto/coste
- Fondo de terminal LD: gradiente radial cálido (`#2d1c22` → `#141014`)

### Refactoring del sistema de tokens y componentes

- Tokens de terminal cableados: `sceneBackground`, `labelColor`, `successColor`, `statusBarBg`, `borderColor`, `separatorColor`, `costColor`, `userMessageBg`, `userMessageBorder`
- `MascotWatermark` — componente reutilizable para mascota en esquina (3 escenas)
- `useSlideIn()` hook — reemplaza patrón spring+interpolate repetido en 5 escenas
- `createCalculateMetadata<T>()` — factory genérica para ambas composiciones
- Tipos de escena exportados desde `schema.ts` (`IntroSceneProps`, etc.)
- `monoFontFamily` en tokens (eliminada carga separada de JetBrains Mono)
- Todas las escenas de ProductShort tokenizadas (eliminados colores hardcodeados)
- Eliminados tokens muertos: `backgroundAlt`, `secondaryForeground`, `primaryHover`, `primaryActive`, `terminal.cursor`
- Eliminadas comprobaciones `isLD` / `useTheme()` en todas las escenas

### Escaleta validation — flujo de aprobación de scripts

- Nuevo paso en ambas skills: presentar escaleta completa al usuario via `AskUserQuestion` antes de generar config.json
- Bucle sin límite de iteraciones hasta aprobación
- `remotion-tutorial-generator`: Paso 4 (Escaleta) + Paso 3 (Copywriting) extraído como paso explícito
- `remotion-short-ld`: Paso 3 (Escaleta) insertado entre Copywriting y Config
- Regla global en `CLAUDE.md`: toda skill de vídeo debe validar la escaleta

### Tema por defecto y tutorial /plugin

- Tema `"linea-directa"` establecido como default obligatorio para todas las composiciones
- Tutorial `/plugin` (54s, 7 escenas): descubrir, instalar y crear plugins de Claude Code

## 2026-03-22

### ClaudeCodeTutorial — Composición horizontal para tutoriales

- Composición `ClaudeCodeTutorial` (1280×720) con 5 escenas: `intro`, `terminal`, `callout`, `outro`, `custom`
- `TerminalScene` con efecto typewriter (command), streaming (claude) e instant reveal (output)
- Sistema de temas: `default` (oscuro/verde) y `linea-directa` (blanco/rojo #CC3333)
- `PixelPhoneMascot` — mascota pixel art del teléfono rojo de Línea Directa
- `customSceneRegistry` para escenas custom por composición
- Skill `/tutorial-generator` — investiga, genera config y renderiza tutoriales de Claude Code
- Script `render.ts` con bundler + Tailwind webpack override
- Tutoriales: `compact-command`, `plan-command`, `git-worktrees-claude-code`

### Infraestructura

- `CLAUDE.md` con arquitectura y constraints del proyecto
- Remotion best practices skill integrada
- VHS/screenRecording añadido y luego eliminado (TUI de Claude Code incompatible con VHS)
- Fix: eslint 9.19→9.39 (ReDoS en @eslint/plugin-kit)
