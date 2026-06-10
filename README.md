# 🎬 Claqueta

**Describe un vídeo en lenguaje natural y obtén un MP4 renderizado.**

Claqueta es una plataforma agéntica de generación de vídeo: un pipeline multi-agente
([LangGraph](https://github.com/langchain-ai/langgraph) + [deepagents](https://github.com/hwchase17/deepagents))
orquestado mediante skills de [Claude Code](https://claude.ai/code) que investiga el tema,
escribe el copy, diseña la escaleta, genera voz y música, y renderiza con
[Remotion](https://remotion.dev) — todo a partir de un prompt.

Cada tipo de vídeo es una **composición** independiente (su propio schema Zod, escenas y skill),
y la arquitectura de temas permite reusar el mismo motor para varias marcas.

### Por qué es interesante

- **Orquestación multi-agente real** — director, scene_creator, audio_planner, voice_generator,
  sound_engineer, validator y render colaboran sobre un grafo LangGraph, no una sola llamada al modelo.
- **El config JSON es la fuente de verdad** — separación limpia entre _qué_ dice el vídeo (config)
  y _cómo_ se renderiza (composición React), validado con Zod en tiempo de render.
- **Skills como interfaz** — `/tutorial-generator`, `/short-ld`: el humano dirige el criterio creativo,
  el agente ejecuta el trabajo técnico.
- **Tests de regresión visual** — vitest + pixelmatch + `renderStill` para que un cambio no rompa un frame.
- **Multi-marca** — temas intercambiables (colores, tipografía, mascota/logo) sobre el mismo motor.

## Setup

```bash
npm i
```

## Composiciones

### ClaudeCodeTutorial (1280×720, horizontal)

Vídeos educativos sobre features de Claude Code con terminal simulada, callouts y branding configurable.

```
/tutorial-generator "explica el comando /plan"
/tutorial-generator "cómo usar git worktrees en Claude Code"
```

Escenas: `intro`, `terminal`, `callout`, `outro`, `custom`

### ProductShort (1080×1920, vertical 9:16)

Shorts de marketing para productos de Línea Directa. Formato vertical para Instagram Reels, TikTok y LinkedIn.

```
/short-ld "seguro de coche"
/short-ld "seguro de mascotas" --headline "Desde 9€/mes"
```

Escenas: `hero`, `benefits`, `pricing`, `cta`

## Cómo funciona

Cada composición sigue el mismo patrón:

1. **Skill** (`/tutorial-generator`, `/short-ld`) — investiga, genera copy, presenta escaleta para aprobación, escribe el config y renderiza
2. **Config JSON** — fuente de verdad con las escenas y sus propiedades
3. **Schema Zod** — valida el config en tiempo de render
4. **Composición React** — renderiza las escenas secuencialmente con `<Series>`

El `config.json` es lo único que necesitas editar para ajustar un vídeo. Re-renderiza con:

```bash
npx tsx scripts/render.ts <ruta-al-config.json>
```

## Renderizado

```bash
# Tutorial
npx tsx scripts/render.ts tutorials/plan-command/config.json

# Short de producto
npx tsx scripts/render.ts shorts/seguro-coche-demo/config.json
```

Si falla con error de Chromium:

```bash
npx remotion browser ensure
```

## Preview

```bash
npm run dev
```

Abre Remotion Studio en el navegador para previsualizar cualquier composición sin renderizar a MP4.

## Estructura

```
src/compositions/
  ClaudeCodeTutorial/    # Composición horizontal (tutoriales)
  ProductShort/          # Composición vertical (marketing shorts)

skills/
  tutorial-generator/    # Skill para /tutorial-generator
  short-ld/              # Skill para /short-ld

tutorials/[slug]/        # Configs + outputs de tutoriales
shorts/[slug]/           # Configs + outputs de shorts
```

## Temas

- `"default"` — fondo oscuro, acentos verdes (estilo Claude Code)
- `"linea-directa"` (por defecto) — fondo blanco, acentos rojos #CC3333, mascota SVG

## Añadir una nueva composición

1. Crea `src/compositions/NuevaComp/` con `schema.ts`, `calculateMetadata.ts`, componente principal y escenas
2. Regístrala en `src/Root.tsx`
3. Añade `"composition": "NuevaComp"` al campo del config JSON
4. Crea una skill en `skills/nombre-skill/SKILL.md` + symlink en `.claude/skills/`
