# ProductShort — Shorts de marketing para Línea Directa

## Problema

El repo genera tutoriales de Claude Code en formato horizontal (1280×720). Línea Directa necesita vídeos cortos de marketing de producto para Instagram Reels, TikTok y LinkedIn en formato vertical (1080×1920, 9:16). Las escenas de tutorial (terminal, callout) no sirven para marketing de producto — se necesitan escenas diseñadas para captar atención, comunicar beneficios y cerrar con CTA.

## Decisión

Nueva composición `ProductShort` separada de `ClaudeCodeTutorial`, con escenas propias de marketing y una skill `/short-ld` que automatiza la generación.

## Marca Línea Directa — Referencia

- **Color primario:** rojo #CC3333
- **Fondo:** blanco #FFFFFF
- **Texto:** #1A1A1A (primario), #888888 (secundario)
- **Highlight:** #FF5555
- **Claim:** "El valor de ser directo"
- **Fonotipo:** "Tirí tirí tirí" — representado visualmente con pulsos/ondas rojas
- **Personaje:** "Tipo Directo" — tono desenfadado, directo, con humor
- **Logo:** teléfono rojo (representado por PixelPhoneMascot en pixel art)
- **Agencia creativa:** PS21

**Productos asegurables:** coche, moto, hogar, salud, movilidad personal, mascotas, autónomos/pymes, antiokupación.

## Schema — `ProductShortSchema`

```typescript
{
  id: string,              // slug: "seguro-coche-2026"
  composition: "ProductShort",
  product: string,         // "Seguro de Coche"
  headline: string,        // "Todo riesgo desde 168€/año"
  theme: "linea-directa",  // siempre LD para shorts de producto
  fps: 30,
  width: 1080,
  height: 1920,
  scenes: Scene[]
}
```

## Escenas

Cada escena lleva `type` (literal) y `durationInSeconds` (number), siguiendo el mismo patrón que ClaudeCodeTutorial.

### `hero` (3-5s) — Primera impresión

```typescript
HeroSceneSchema = {
  type: "hero",
  title: string,           // nombre del producto: "Seguro de Coche"
  subtitle: string?,       // headline: "Todo riesgo desde 168€/año"
  durationInSeconds: number (1-10),
}
```

- Fondo rojo #CC3333
- `title` en grande (blanco, bold)
- `subtitle` debajo
- PixelPhoneMascot entra con bounce desde abajo
- Spring rápido, todo aparece en <1s

### `benefits` (5-8s) — Valor del producto

```typescript
BenefitItem = { icon: string, text: string }

BenefitsSceneSchema = {
  type: "benefits",
  title: string?,                  // encabezado opcional: "¿Qué incluye?"
  items: BenefitItem[] (min 1),    // ej: { icon: "🛡️", text: "Asistencia 24h" }
  durationInSeconds: number (2-15),
}
```

- Fondo blanco, texto #1A1A1A
- `items` aparecen uno a uno (staggered spring, ~400ms entre cada uno)
- `icon` a la izquierda de cada bullet (emoji string)
- Barra lateral roja #CC3333 como acento

### `pricing` (3-5s) — Gancho de precio

```typescript
PricingSceneSchema = {
  type: "pricing",
  price: string,            // "168€"
  period: string?,          // "al año" | "al mes" — default "al año"
  note: string?,            // "sin permanencia" | "primer año"
  variant: "light" | "dark", // light = fondo blanco + marco rojo, dark = fondo rojo + texto blanco
  durationInSeconds: number (1-10),
}
```

- `price` grande centrado con animación scale spring
- `period` como texto secundario debajo
- `note` en pequeño debajo del period
- `variant` controla la combinación de colores

### `cta` (3-4s) — Call to action

```typescript
CtaSceneSchema = {
  type: "cta",
  text: string,       // default: "Calcula tu precio"
  url: string?,       // default: "lineadirecta.com"
  durationInSeconds: number (1-10),
}
```

- `text` como CTA principal
- `url` debajo
- PixelPhoneMascot a escala pequeña
- 3 ondas/pulsos rojos animados representando el "Tirí tirí tirí"
- Fondo blanco, acento rojo

**Duración total típica:** 15-20 segundos.

## Skill `/short-ld`

### Invocación

```
/short-ld "seguro de coche"
/short-ld "seguro de mascotas" --headline "Desde 9€/mes"
```

### Flujo

1. **Research:** WebFetch a lineadirecta.com → extraer beneficios, precios, coberturas del producto. Si el scraping falla, pedir al usuario los datos del producto manualmente
2. **Copywriting:** Generar headline, bullets de beneficios y CTA con tono "directo, desenfadado"
3. **Config:** Escribir `shorts/[slug]/config.json`
4. **Render:** `npx tsx scripts/render.ts shorts/[slug]/config.json`
5. **Resumen:** Informar duración, escenas, ofrecer ajustes

### Salida

`shorts/[slug]/output.mp4` (gitignored). Los `config.json` sí se commitean.

## Integración técnica

### Archivos nuevos

- `src/compositions/ProductShort/schema.ts`
- `src/compositions/ProductShort/ProductShort.tsx`
- `src/compositions/ProductShort/calculateMetadata.ts`
- `src/compositions/ProductShort/scenes/HeroScene.tsx`
- `src/compositions/ProductShort/scenes/BenefitsScene.tsx`
- `src/compositions/ProductShort/scenes/PricingScene.tsx`
- `src/compositions/ProductShort/scenes/CtaScene.tsx`
- `skills/short-ld/SKILL.md`
- `.claude/skills/short-ld` → symlink a `skills/short-ld/`

### Archivos a modificar

- `src/Root.tsx` — Registrar composición `ProductShort`
- `scripts/render.ts` — Campo `"composition"` en el JSON para elegir composición (default: `ClaudeCodeTutorial`)
- `.gitignore` — Añadir `shorts/*/output.mp4`

### Reutilización

- `ThemeContext` + `useTheme()` → importar desde `../ClaudeCodeTutorial/ThemeContext`
- `PixelPhoneMascot` → importar desde `../ClaudeCodeTutorial/components/PixelPhoneMascot`
- Si en el futuro hay una 3ª composición, extraer a `src/shared/`

### Render script

Un solo `scripts/render.ts` que lee `config.composition` (default `"ClaudeCodeTutorial"`) para seleccionar qué composición renderizar. Backwards compatible: los configs existentes sin campo `composition` siguen funcionando.

## Animaciones

Mismas reglas que ClaudeCodeTutorial:
- Solo `useCurrentFrame()` + `spring()` + `interpolate()`
- Prohibido CSS transitions y animaciones Tailwind
- Remotion renderiza frame a frame
