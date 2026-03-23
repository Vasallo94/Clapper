---
name: short-ld
description: Genera shorts de marketing vertical (9:16) para productos de Línea Directa. Invoca con /short-ld "producto" [--headline "texto"]
---

# Short LD — Marketing Shorts para Línea Directa

Genera un vídeo MP4 vertical (1080×1920) de marketing para un producto de Línea Directa.

## Cuando se te invoca

El usuario pasa un producto y opcionalmente un headline:
- `/short-ld "seguro de coche"`
- `/short-ld "seguro de mascotas" --headline "Desde 9€/mes"`

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

## Paso 3: Genera config.json

Escribe `shorts/[slug]/config.json` válido según `src/compositions/ProductShort/schema.ts`.

### Estructura recomendada (15-20s total):
1. `hero` (3-5s): nombre del producto + headline en fondo rojo
2. `benefits` (5-8s): lista de beneficios con iconos
3. `pricing` (3-5s): precio destacado (variant "dark" para impacto)
4. `cta` (3-4s): call to action + URL

### Marca Línea Directa — Referencia:
- **Color primario:** rojo #CC3333
- **Claim:** "El valor de ser directo"
- **Tono:** desenfadado, directo, con humor ("Tipo Directo")
- **Productos:** coche, moto, hogar, salud, movilidad personal, mascotas, autónomos/pymes, antiokupación

## Paso 4: Renderizar

```bash
npx tsx scripts/render.ts shorts/[slug]/config.json
```

Si falla con error de Chromium:
```bash
npx remotion browser ensure
npx tsx scripts/render.ts shorts/[slug]/config.json
```

## Paso 5: Resumen

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
