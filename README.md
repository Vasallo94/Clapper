# Tutorial Video Generator

Pipeline para generar vídeos educativos sobre features de Claude Code usando [Remotion](https://remotion.dev).

## Uso rápido

```bash
npm i
npx tsx scripts/render.ts tutorials/plan-command/config.json
```

El vídeo se genera en `tutorials/[slug]/output.mp4`.

## Estructura

- `src/compositions/ClaudeCodeTutorial/` — componentes de escenas (intro, terminal, callout, outro)
- `tutorials/` — configs JSON de cada tutorial
- `scripts/render.ts` — script de renderizado
- `skills/tutorial-generator/` — skill de Claude Code para generar tutoriales

## Temas

- `"default"` — fondo oscuro, acentos verdes (estilo Claude Code)
- `"linea-directa"` — fondo blanco, acentos rojos #CC3333, mascota pixel art

## Preview

```bash
npm run dev
```
