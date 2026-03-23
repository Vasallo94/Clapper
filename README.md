# Remotion Video Platform

Plataforma de generación de vídeos con [Remotion](https://remotion.dev), automatizada con skills de [Claude Code](https://claude.ai/code). Cada tipo de vídeo es una composición independiente con su propio schema, escenas y skill.

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

1. **Skill** (`/tutorial-generator`, `/short-ld`) — investiga, genera copy, escribe el config y renderiza
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
- `"linea-directa"` — fondo blanco, acentos rojos #CC3333, mascota pixel art

## Añadir una nueva composición

1. Crea `src/compositions/NuevaComp/` con `schema.ts`, `calculateMetadata.ts`, componente principal y escenas
2. Regístrala en `src/Root.tsx`
3. Añade `"composition": "NuevaComp"` al campo del config JSON
4. Crea una skill en `skills/nombre-skill/SKILL.md` + symlink en `.claude/skills/`
