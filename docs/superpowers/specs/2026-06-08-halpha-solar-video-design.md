# Diseño · Short vertical "El Sol en Hα" (LinkedIn)

- **Fecha:** 2026-06-08
- **Autor:** Enrique Vasallo (con Claude Code)
- **Estado:** Aprobado (escaleta validada por el humano)

## Contexto y objetivo

Crear un short vertical (9:16, LinkedIn) que presente la web educativa de física
solar **H-alpha** (https://vasallo94.github.io/H-alpha/, repo local en
`~/Personal/Developer/H-alpha`). El vídeo debe:

- Enganchar con la pregunta "¿quieres ver el Sol con otros ojos?".
- Explicar, de la física a la imagen, qué se ve en una imagen solar en Hα y por qué.
- Apoyarse en **material e imágenes** de la web, no ser solo texto.
- Llevar una **voz en off serena** (entonación sobria, nada dramática).
- **Mimetizar el estilo visual de la web** para que haya continuidad narrativa con ella.
- Cerrar con CTA a la web.

Ángulo elegido: **"De la física a la imagen"** (explicador, ~78s). Idioma: **español**.
Voz: **masculina, divulgador sereno**.

## Estilo visual — theme `h-alpha`

Clonar la paleta y tipografía exactas de `H-alpha/src/styles/global.css` como un
theme nuevo en `src/shared/themes/themes.ts`. Estética "atlas científico de papel":

| Token      | Valor     | Rol                                     |
| ---------- | --------- | --------------------------------------- |
| paper      | `#f4f1e8` | Fondo principal (crema)                 |
| surface    | `#fffdfa` | Tarjetas/paneles                        |
| ink        | `#16232c` | Texto principal                         |
| muted      | `#586a72` | Texto secundario                        |
| line       | `#d5d8d2` | Bordes finos                            |
| solar      | `#d94332` | Acento primario (rojo solar)            |
| solar-deep | `#9d241c` | Acento intenso / eyebrows               |
| accent     | `#2c7782` | Acento secundario (teal instrumental)   |
| instrument | `#14313f` | Petróleo oscuro (fondos de instrumento) |

- Tipografía **serif** (KaTeX_Main / Times New Roman / ui-serif).
- Rejilla de fondo sutil tipo atlas (líneas `rgba(20,49,63,0.055)` cada 72px).
- Bordes redondeados 8px, sombras suaves (`0 14px 34px rgba(22,31,38,0.09)`).
- Eyebrows en mayúsculas, letter-spacing, color `solar-deep`.

El theme debe rellenar **todos** los campos de `ThemeTokens` (incluyendo
`terminal.*`, `mascot.show=false`, `card.*`) para no romper escenas que los lean.

## Enfoque técnico

- **Reutilizar el motor existente**: `CompositionShell` + el `SCENE_MAP` /
  `customSceneRegistry` de `ClaudeCodeTutorial` ya son dimension-agnostic y
  theme-driven. No se crea un motor nuevo.
- **Composición vertical nueva** registrada en `src/Root.tsx` a **1080×1920, 30fps**,
  que monta el mismo pipeline de escenas con `theme: "h-alpha"`.
  (Nombre tentativo: `VerticalExplainer` — genérico, reutilizable para futuros
  explicadores verticales, no atado a H-alpha.)
- **Diagramas** (etalon, cadena óptica, niveles de hidrógeno): recrearlos como
  escenas Remotion **nativas animadas** (`block-diagram`, `flow-diagram`,
  `big-number`) con el theme h-alpha. Más fluido y coherente que incrustar los SVG.
- **Fotos reales**: copiar `H-alpha/public/images/sun-h-alpha.png` (protagonista) a
  `public/images/halpha/` del proyecto Remotion. Opcionalmente las 2 fotos de filtros.
- **Voz**: pipeline de voiceover existente (`scripts/generate-voiceover.ts`), voz
  masculina serena. **Director + sound-engineer** con dirección sobria: música
  ambiente mínima, sin braams ni golpes dramáticos. Subtítulos karaoke de una
  palabra (preferencia ya establecida del usuario).

## Escaleta (~78s)

Coordenadas de anotación tomadas literalmente de `H-alpha/src/content/siteCopy.ts`
(`finalImage.annotations`).

### Escena 1 — Gancho (~8s)

- **Visual:** foto Hα entrando sobre fondo negro que se abre a papel. Rótulo:
  "¿Quieres ver el Sol con otros ojos?".
- **VO:** "A simple vista, el Sol es un disco liso y amarillo. Pero en una sola
  línea de color, se transforma."

### Escena 2 — 656,28 nm (~14s)

- **Visual:** `big-number` "656,28 nm" + apoyo sobre hidrógeno y cromosfera.
- **VO:** "El Sol es casi todo hidrógeno, y el hidrógeno emite un rojo muy concreto:
  la línea hidrógeno-alfa. En ese color brilla la cromosfera, una capa fina sobre la
  superficie que la luz blanca normalmente esconde."

### Escena 3 — Aislar el color · el etalon (~14s)

- **Visual:** `block-diagram` del etalon: dos placas, rayos, interferencia
  constructiva/destructiva.
- **VO:** "Para quedarse solo con ese rojo, un telescopio Hα usa un etalon: dos
  espejos casi perfectos, muy juntos. La luz rebota miles de veces y solo una nota,
  la de Hα, sale reforzada. Todo lo demás se cancela."

### Escena 4 — La cadena óptica (~12s)

- **Visual:** `flow-diagram`: Objetivo → ERF → Etalon → Blocking filter → Ojo/cámara.
- **VO:** "Pero el etalon no trabaja solo. Antes, un filtro aparta el calor; después,
  otro limpia la luz sobrante. Sin esa cadena, ni hay imagen, ni hay seguridad."

### Escena 5 — Lee la imagen (~16s) — pago del gancho

- **Visual:** `annotated-image` con `sun-h-alpha.png` y 5 anotaciones reveladas en
  secuencia, en las coordenadas reales de la web:
  - Filamentos (x42, y51)
  - Plages (x40, y37)
  - Mancha solar (x48, y38)
  - Protuberancias (x69, y31)
  - Textura cromosférica (x57, y60)
- **VO:** "Y ahora ya sabes leer lo que ves: filamentos oscuros, plages brillantes,
  manchas, protuberancias en el borde y la textura de espículas que da el aspecto
  granulado."

### Escena 6 — Cierre + CTA (~8s)

- **Visual:** título + URL de la web sobre papel; mascota/logo ausente (theme sin mascot).
- **VO:** "La misma estrella, vista en un solo color. Tienes la explicación completa,
  paso a paso, en la web."
- **Rótulo:** "Aprende a leer el Sol · vasallo94.github.io/H-alpha".

## Criterios de aceptación

1. El vídeo renderiza a MP4 vertical 1080×1920, 30fps, ~75–82s, sin errores.
2. El theme `h-alpha` reproduce fielmente la paleta y la sensación de la web
   (papel crema, serif, rojo solar + teal); ninguna escena cae al theme `default`.
3. La escena 5 muestra las 5 estructuras sobre la foto real en las posiciones correctas.
4. La voz en off es serena (sin entonación dramática) y los subtítulos son karaoke
   de una sola palabra.
5. La música de fondo es ambiental y discreta, con ducking bajo la voz; sin SFX
   dramáticos.
6. El config.json es la única fuente de verdad (sin ediciones manuales del humano).

## Fuera de alcance (YAGNI)

- Variante en inglés (se deja el copy preparado pero no se renderiza ahora).
- Secciones de tuning, comparación de filtros y seguridad detallada (la web las cubre;
  el short prioriza el arco física → imagen).
- Diagramas interactivos (spectrum explorer, filter comparison) — son interactivos,
  no aportan a un vídeo lineal.

## Riesgos

- **Escenas no probadas en vertical:** aunque son responsive (AbsoluteFill + %),
  algún layout (p. ej. flow-diagram horizontal) puede necesitar ajuste para 9:16.
  Mitigación: render de stills por escena (`scripts/render-scene-stills.ts`) y revisión.
- **Theme incompleto:** si falta un token, escenas que lo lean romperán. Mitigación:
  copiar la forma completa de un theme existente y sustituir valores.
- **Duración de audio vs vídeo:** las duraciones se recalculan desde el audio medido
  (pipeline dual TTS). Mitigación: dejar que `calculateMetadata` derive la duración.
