# Tutorial Video Generator

Pipeline para generar vídeos educativos sobre features de Claude Code usando [Remotion](https://remotion.dev).

## Setup

```bash
npm i
```

## Generar un tutorial con Claude Code

Este proyecto incluye una **skill de Claude Code** que automatiza todo el proceso: investigar la feature, generar el config JSON y renderizar el vídeo.

### 1. Registrar la skill

La skill ya está registrada en `.claude/skills/tutorial-generator`. Si clonas el repo, los symlinks deberían funcionar directamente. Si no, créalos:

```bash
mkdir -p .claude/skills
ln -s ../../skills/tutorial-generator .claude/skills/tutorial-generator
```

### 2. Invocar la skill desde Claude Code

Dentro de una sesión de Claude Code en este directorio:

```
/tutorial-generator "explica el comando /plan"
/tutorial-generator "cómo usar git worktrees en Claude Code"
/tutorial-generator "https://docs.anthropic.com/..." "explica esta feature"
```

Claude Code se encarga de:
- Investigar la feature (Context7, web search)
- Lanzar un subagente que documenta comandos y outputs reales
- Generar `tutorials/[slug]/config.json` con las escenas
- Renderizar el MP4 automáticamente

### 3. Ajustar y re-renderizar

El `config.json` es la fuente de verdad. Si quieres cambiar algo, edita el JSON y:

```bash
npx tsx scripts/render.ts tutorials/[slug]/config.json
```

## Renderizado manual

Si ya tienes un `config.json`, renderiza directamente:

```bash
npx tsx scripts/render.ts tutorials/plan-command/config.json
```

El vídeo se genera en `tutorials/[slug]/output.mp4`.

Si falla con error de Chromium:

```bash
npx remotion browser ensure
```

## Temas

Se configura con el campo `"theme"` en el config JSON:

- `"default"` — fondo oscuro, acentos verdes (estilo Claude Code)
- `"linea-directa"` — fondo blanco, acentos rojos #CC3333, mascota pixel art

## Preview (Remotion Studio)

```bash
npm run dev
```

Abre el Studio en el navegador para previsualizar las composiciones sin renderizar a MP4.
