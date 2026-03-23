# Changelog

## 2026-03-23

### ProductShort — Composición vertical para marketing

- Nueva composición `ProductShort` (1080×1920, 9:16) con 4 escenas: `hero`, `benefits`, `pricing`, `cta`
- Skill `/short-ld` para generar shorts de marketing de Línea Directa automaticamente
- `render.ts` soporta campo `composition` en el config (backwards compatible)
- Smoke test: `shorts/seguro-coche-demo/config.json`
- README reescrito como plataforma multi-composición

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
