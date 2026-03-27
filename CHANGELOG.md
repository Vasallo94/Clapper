# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

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

### Changed

- Font sizes increased across all scenes for mobile readability
- Prettier config completed (semi: false, printWidth: 120, trailingComma, arrowParens)

### Fixed

- FlowDiagramScene orb animation rewritten with per-node cycle system
- Terminal content overflow with estimateLineHeight() scroll calculation

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
