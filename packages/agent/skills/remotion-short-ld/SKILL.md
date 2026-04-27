---
name: remotion-short-ld
description: Genera shorts de marketing vertical (9:16) para productos de Línea Directa. Invoca con /remotion-short-ld "producto" [--headline "texto"]
---

# Short LD — Marketing Shorts para Línea Directa

Genera un vídeo MP4 vertical (1080×1920) de marketing para un producto de Línea Directa.

## Cuando se te invoca

El usuario pasa un producto y opcionalmente un headline:

- `/remotion-short-ld "seguro de coche"`
- `/remotion-short-ld "seguro de mascotas" --headline "Desde 9€/mes"`

## Reglas de parsing

- El primer argumento es el nombre del producto.
- `--headline "texto"` override del headline auto-generado.
- Genera un slug limpio: "Seguro de Coche" → `seguro-coche`.
- Crea la carpeta `shorts/[slug]/`.

## Paso 1: Research

Lanza en paralelo:

- **WebFetch** → `lineadirecta.com` busca la página del producto para extraer beneficios, precios y coberturas.
- **WebSearch** → busca precios y ofertas actuales del producto en Línea Directa.

Si el scraping falla, pide al usuario los datos del producto manualmente (precio, beneficios, coberturas).

## Paso 2: Copywriting

Con los datos del producto, genera:

- **headline**: gancho de precio o beneficio principal (tono directo, desenfadado, "Tipo Directo")
- **benefit items**: 3-5 bullets con emoji + texto corto
- **price + period**: precio real extraído o "Consulta tu precio"
- **CTA text**: acción clara ("Calcula tu precio", "Pide presupuesto")

Además, define un brief editorial mínimo:

- plataforma objetivo
- audiencia
- objetivo
- promesa
- tono
- CTA
- estrategia de hook

## Paso 3: Escaleta — Validación con el usuario

Antes de generar el config.json, presenta la escaleta completa al usuario para su aprobación.

### Formato de la escaleta

Genera un bloque de texto con este formato y preséntalo usando `AskUserQuestion`:

```
## Script: [nombre del producto]

**Escena 1 — hero ([duración]s)**
  Producto: [nombre]
  Headline: "[headline]"

**Escena 2 — benefits ([duración]s)**
  Título: "[título]"
  • [emoji] [texto beneficio 1]
  • [emoji] [texto beneficio 2]
  • [emoji] [texto beneficio 3]

**Escena 3 — pricing ([duración]s)**
  Precio: [precio]
  Periodo: [periodo]
  Variante: [light/dark]

**Escena 4 — cta ([duración]s)**
  CTA: "[texto]"
  URL: [url]

Duración total: ~[total]s
```

Debajo de cada escena añade también:

- **Idea principal:** qué debe quedarse el usuario
- **Promesa visual:** qué gesto visual debe sostener esa idea

Y para `hero` / `cta` añade:

- **Opening:** pausa inicial antes del gran movimiento
- **Cierre:** hold final suficiente para CTA o marca

### Interacción

Usa `AskUserQuestion` con dos opciones:

- **Aprobar**: continuar al Paso 4 (genera config.json).
- **Pedir cambios**: el usuario indica qué ajustar. Modifica la escaleta y vuelve a presentarla.

El bucle no tiene límite de iteraciones. Repite hasta que el usuario apruebe.

## Paso 4: Genera draft de config.json

Con la escaleta aprobada, escribe `shorts/[slug]/config.json` válido según `src/compositions/ProductShort/schema.ts`.

Incluye ya:

- `brief`
- escenas base
- `timing` / `beats` si la escaleta ya los deja claros

Si el short lleva locución:

- usa `voiceover.provider: "elevenlabs"` cuando se busque más control expresivo
- deja los matices principales en el texto del guion y usa `voiceover.elevenlabs` para afinar `modelId`, `voiceSettings`, `speed`, `seed`, `applyTextNormalization` o continuidad entre clips
- no metas un `prompt` oculto separado del copy; el tono debe quedar trazable en el JSON

### Estructura recomendada (15-20s total):

1. `hero` (3-5s): nombre del producto + headline en fondo rojo
2. `benefits` (5-8s): lista de beneficios con iconos
3. `pricing` (3-5s): precio destacado (variant "dark" para impacto)
4. `cta` (3-4s): call to action + URL

### Marca Línea Directa — Referencia:

- **Color primario:** rojo #CC3333
- **Color secundario:** verde #225050
- **Claim:** "El valor de ser directo"
- **Tono:** desenfadado, directo, con humor ("Tipo Directo")
- **Mascota:** `PhoneMascot` (SVG del teléfono con ruedas). Animations: `"entry"` (intro), `"idle"` (breathing), `"dial"` (terminal), `"ring"` (attention)
- **Productos:** coche, moto, hogar, salud, movilidad personal, mascotas, autónomos/pymes, antiokupación

## Paso 5: Director pass

Invoca la skill `remotion-director` antes del render final.

La skill debe:

- mejorar hook, ritmo y CTA
- añadir `timing` y `beats` cuando falten
- alinear copy y visuales
- avisar si la pieza sigue sin respiración suficiente

Si el usuario decide omitirla, avísalo antes del render.

## Paso 6: Renderizar

```bash
npx tsx scripts/render.ts shorts/[slug]/config.json
```

Si falla con error de Chromium:

```bash
npx remotion browser ensure
npx tsx scripts/render.ts shorts/[slug]/config.json
```

## Paso 7: Resumen

Informa al usuario:

- Escenas generadas (tipos y duraciones)
- Duración total del vídeo
- Ruta: `shorts/[slug]/output.mp4`
- Ofrece ajustes si quiere cambiar algo

## Notas importantes

- **NUNCA uses CSS transitions o clases de animación de Tailwind** en componentes React.
- **Todas las animaciones deben derivar de `useCurrentFrame()`** via `spring()` o `interpolate()`.
- El `config.json` es el source of truth. Si el usuario quiere ajustes, edita el JSON y re-renderiza.
- Los vídeos se guardan en `shorts/[slug]/output.mp4` (gitignored). Los `config.json` sí se commitean.
- Un short final debería pasar por dirección editorial antes de considerarse listo para publicar.

## Reglas de código para escenas:

- Importa el tipo de props desde `schema.ts` (`import type { HeroSceneProps } from "../schema"`) — no uses `Extract<...>`
- Usa `useThemeTokens()` para todos los colores — nunca hardcodees `#CC3333`, `#FFFFFF`, `system-ui` etc.
- Para animaciones "entra desde abajo", usa `useSlideIn()` de `hooks/useSlideIn.ts`
- Colores de la marca están en tokens: `tokens.primary` (#CC3333), `tokens.primaryForeground` (#FFFFFF), `tokens.secondary` (#225050), `tokens.fontFamily` (Arial)
- `PhoneMascot` acepta prop `darkBg` para outlines claros sobre fondos oscuros
