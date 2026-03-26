# Design: "Claude Code recuerda quién eres"

Educational video for LinkedIn explaining Claude Code's memory system using a real astrophotography conversation as the anchor example.

## Video Identity

| Property | Value |
|----------|-------|
| Composition | `ClaudeCodeTutorial` (1280×720, 30fps) |
| Theme | `atom-dark` |
| Duration | ~4:50 (~8700 frames) |
| Language | Spanish |
| Voiceover | Deferred (text-only first pass) |
| Tutorial slug | `tutorials/claude-code-memory/` |

## Narrative Structure

"El misterio" — lead with the real example (telescope conversation), reveal the memory file, then zoom out to explain the full system. Problem→solution arc but anchored in a concrete case.

## Scene Breakdown

### Scene 1 — Hook (Intro, 5s / 150 frames)

- **Type:** `intro`
- **Title:** "Claude Code recuerda quién eres"
- **Subtitle:** "Así funciona su sistema de memoria"
- Standard IntroScene with atom-dark theme (blue→purple accent line)

### Scene 2 — Conversación de telescopios (Terminal, 35s / 1050 frames)

- **Type:** `terminal`
- **Title:** "Una conversación sobre telescopios solares"
- Simulated Claude Code session. Short, focused exchange:
  - User asks about solar astrophotography setup for the 2026 eclipse in Spain
  - Claude recommends HelioStar 100Ha + ASI432MM + Powermate 2x
  - User confirms the choice, conversation ends naturally
- No Bortle/deep-sky discussion (irrelevant for solar)
- Purpose: show a normal conversation where Claude learns personal info without being asked to remember anything

### Scene 3 — El archivo aparece (File Explorer, 45s / 1350 frames)

- **Type:** `custom` → `FileExplorerScene`
- **New custom component** (must be built)
- Animation sequence:
  1. Show directory tree: `~/.claude/projects/remotion/memory/` with `MEMORY.md` already present
  2. New file `user_astrophotography.md` fades in with spring animation
  3. File "opens" — content expands to show frontmatter (`name`, `description`, `type: user`) and body
  4. Key sections highlight sequentially: equipment list, eclipse plans, user profile
- Callout text overlay: "Claude decidió guardar esto. Nadie se lo pidió."
- All icons as inline SVG (no emojis)

### Scene 4 — Zoom out: los 3 sistemas (Block Diagram, 30s / 900 frames)

- **Type:** `custom` → `BlockDiagramScene`
- **New custom component** (must be built)
- Three blocks appear with staggered spring animations:
  1. **CLAUDE.md** — "Instrucciones que tú escribes" (blue border)
  2. **Auto Memory** — "Notas que Claude toma solo" (purple border)
  3. **Auto Dream** — "Consolidación automática" (orange border)
- Connecting lines drawn with `evolvePath()` between blocks
- Brief label under each block
- Purpose: give the viewer the mental map before diving into each system

### Scene 5 — CLAUDE.md explicado (Callout, 30s / 900 frames)

- **Type:** `callout`
- **Position:** `top`
- **Background:** `solid`
- Text: "CLAUDE.md — La versión manual. Archivos markdown donde TÚ le dices a Claude cómo comportarse. Tres alcances: global (~/.claude/), proyecto (./CLAUDE.md), y organización."
- Keep brief — simplest concept in the system

### Scene 6 — Auto Memory deep dive (55s / 1650 frames)

Two separate scenes in config:

**Scene 6a — Los 4 tipos de memoria (Block Diagram, 30s / 900 frames)**
- **Type:** `custom` → `BlockDiagramScene` (reuse with different props, `layout: "grid"`)
- Four blocks appear with staggered springs, each with a color and one-line example:
  - **user** (blue): "Es astrofotógrafo, prefiere recomendaciones con investigación"
  - **feedback** (green): "No resumir al final de cada respuesta"
  - **project** (purple): "Merge freeze a partir del 5 de marzo"
  - **reference** (orange): "Los bugs se trackean en Linear proyecto INGEST"

**Scene 6b — MEMORY.md como índice (File Explorer, 25s / 750 frames)**
- **Type:** `custom` → `FileExplorerScene` (reuse with MEMORY.md as the expanded file)
- Show MEMORY.md content: one-line entries pointing to memory files
- Callout text: "Claude lee este índice al empezar cada sesión. Si algo es relevante, abre el archivo completo. Si no, lo ignora."

### Scene 7 — Auto Dream (Flow Diagram, 75s / 2250 frames)

- **Type:** `custom` → `FlowDiagramScene`
- **New custom component** (must be built)
- Opens with the analogy: callout text "Como el sueño REM consolida tu memoria del día, Auto Dream consolida las notas de Claude"
- Flow diagram with 4 nodes connected by SVG paths:
  1. **Orientación** — "Inventaría todos los archivos de memoria"
  2. **Recopilar señal** — "Busca correcciones, temas recurrentes"
  3. **Consolidación** — "Fusiona duplicados, convierte fechas relativas a absolutas, elimina obsoletos"
  4. **Poda e indexado** — "Actualiza MEMORY.md, mantiene bajo 200 líneas"
- Animated data particle travels the path using `evolvePath()` + `getPointAtLength()`
- Each node lights up (border color change) as the particle arrives
- After the flow: callout with trigger conditions "Se activa cuando: 24h desde la última ejecución + 5 sesiones completadas"

### Scene 8 — Outro (Outro, 15s / 450 frames)

- **Type:** `outro`
- **Title:** "La memoria de Claude Code"
- **Bullets:**
  - `/memory` — ver y editar archivos de memoria
  - `/dream` — forzar consolidación manual
  - `/init` — generar CLAUDE.md inicial
- CTA: "Sígueme para más sobre Claude Code"

## New Custom Components Required

Three new scene components to register in `customSceneRegistry.ts`:

### 1. FileExplorerScene

- Props: `files` (array of `{name, path, content?, highlighted?}`), `rootPath` (string), `expandFile` (string, which file to open), `calloutText` (optional)
- Visual: IDE-style file tree on left, file content panel on right
- Animations: files appear with staggered springs, selected file expands, content sections highlight sequentially
- All folder/file icons as inline SVG

### 2. BlockDiagramScene

- Props: `blocks` (array of `{id, title, subtitle, color}`), `connections` (array of `{from, to}`), `layout` (`"horizontal"` | `"grid"`)
- Visual: rounded-rectangle blocks with colored top borders, connected by animated lines
- Animations: blocks appear with staggered springs, connections drawn with `evolvePath()`

### 3. FlowDiagramScene

- Props: `nodes` (array of `{id, title, description, color}`), `introText` (string), `outroText` (string), `showParticle` (boolean)
- Visual: nodes as rounded rectangles in a horizontal or vertical flow, connected by SVG paths
- Animations: nodes appear sequentially, particle travels path using `getPointAtLength()`, nodes light up on arrival
- Intro/outro text as animated callout overlays

## Design Constraints

- **No emojis anywhere** — all visual elements as inline SVG
- **All animations via `useCurrentFrame()` + `spring()`/`interpolate()`** — no CSS transitions
- **Theme tokens via `useThemeTokens()`** — never hardcode colors
- **Custom components registered in `customSceneRegistry.ts`** with static imports
- **Config.json is source of truth** — all content lives in the config, components are generic and reusable

## Color Palette (atom-dark theme reference)

| Role | Color | Token |
|------|-------|-------|
| Background | `#282c34` | `background` |
| Foreground | `#abb2bf` | `foreground` |
| Primary (blue) | `#61afef` | `primary` |
| Secondary (purple) | `#c678dd` | `secondary` |
| Green | `#98c379` | `terminal.command` / `terminal.successColor` |
| Orange | `#d19a66` | `terminal.dots[1]` |
| Red | `#e06c75` | `terminal.dots[0]` |
| Borders | `#3e4451` | `terminal.borderColor` |
| Muted text | `#636d83` | `foregroundMid` |
