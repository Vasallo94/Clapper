# Spec: Tutorial Generator — Claude Code Skill

**Fecha**: 2026-03-22
**Estado**: Revisado (v2)

---

## Intención del proyecto

Construir un sistema que permita generar vídeos educativos animados de alta calidad con una sola instrucción en lenguaje natural. El primer agente cubre tutoriales de Claude Code en la terminal. La arquitectura debe ser lo suficientemente genérica para añadir más tipos de agentes en el futuro (presentaciones, animaciones explicativas, social clips, etc.).

El principio guía: **el usuario describe qué quiere enseñar, el sistema se encarga de todo lo demás** — investigar, estructurar, animar y renderizar.

---

## Scope de este spec

Cubre únicamente el primer agente: `tutorial-generator`, especializado en tutoriales de Claude Code con terminal simulada.

---

## Arquitectura general

```
remotion-playground/
├── skills/                                   ← Skills del proyecto (convención del repo)
│   ├── remotion-best-practices/              ← Remotion Agent Skills (existente, symlink)
│   └── tutorial-generator/
│       └── index.md                          ← Skill del agente (NUEVO)
│
├── src/
│   ├── compositions/
│   │   └── ClaudeCodeTutorial/               ← Template parametrizable (NUEVO)
│   │       ├── schema.ts                     ← Zod schema — contrato JSON
│   │       ├── ClaudeCodeTutorial.tsx        ← Composición raíz
│   │       ├── calculateMetadata.ts          ← Duración dinámica
│   │       ├── customSceneRegistry.ts        ← Registro de escenas custom (ver nota)
│   │       └── scenes/
│   │           ├── IntroScene.tsx
│   │           ├── TerminalScene.tsx         ← Componente estrella
│   │           ├── CalloutScene.tsx
│   │           ├── OutroScene.tsx
│   │           └── custom/                   ← Escenas custom generadas por el agente
│   └── Root.tsx
│
├── tutorials/                                ← Tutoriales generados (gitignored los MP4)
│   └── [slug]/
│       ├── config.json                       ← JSON de escenas (source of truth)
│       ├── assets/                           ← Assets específicos del tutorial
│       └── output.mp4                        ← Vídeo renderizado (gitignored)
│
├── scripts/
│   └── render.ts                             ← Invoca renderMedia() + bundle()
│
├── .gitignore                                ← tutorials/*/output.mp4
└── docs/
    └── superpowers/specs/
        └── 2026-03-22-tutorial-generator-design.md
```

---

## Componente 1: La Skill (`tutorial-generator`)

### Ubicación

`skills/tutorial-generator/index.md`

> **Nota sobre paths**: Los skills del proyecto viven en `skills/` en la raíz (no en `.claude/skills/`). La convención es que `.claude/skills/` sea un symlink o alias hacia `skills/`, como ocurre con `remotion-best-practices`.

### Qué hace

Skill de Claude Code invocable con `/tutorial-generator "<instrucción>"`.
Orquesta investigación → script → archivos → render.

### Flujo detallado

```
1. PARSE de la instrucción
   - Regla de parsing: si el primer argumento empieza por "https?://", es una URL de referencia;
     el siguiente argumento (o el primero si no hay URL) es el tema.
   - Ejemplo: /tutorial-generator "https://docs.anthropic.com/..." "explica esta feature"
   - Genera slug limpio del tema (ej: "compact-command")
   - Crea la carpeta tutorials/[slug]/ y tutorials/[slug]/assets/

2. RESEARCH (paralelo donde sea posible)
   a. Context7 MCP → busca la feature en docs de Claude Code / Anthropic
   b. WebSearch → ejemplos, posts, threads relacionados
   c. WebFetch → si se pasó una URL, la lee directamente
   d. Lee skills/remotion-best-practices/ → entiende las capacidades del template
      (qué tipos de escenas existen, qué efectos son posibles)
   → Produce: ResearchReport (ver estructura abajo)

3. DEMO SUBAGENTE (activo por defecto, omitir con --no-demo)
   - Lanza un subagente con instrucción: "Ejecuta y documenta esta feature de Claude Code: [tema]"
   - El subagente debe responder con este formato estricto:
     ---
     COMANDOS EXACTOS: [lista de comandos]
     OUTPUT REAL: [output literal que produce la herramienta]
     CASOS DE USO: [2-3 situaciones donde es útil]
     ERRORES COMUNES: [1-2 errores típicos del usuario]
     NOTAS: [cualquier comportamiento inesperado o matiz]
     ---
   - El output estructurado alimenta directamente al Script Writer

4. SCRIPT WRITER
   - Genera tutorials/[slug]/config.json validado contra el Zod schema
   - Si una escena requiere código React custom:
     a. Escribe el componente en src/compositions/ClaudeCodeTutorial/scenes/custom/[SceneName].tsx
     b. Actualiza src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts añadiendo el import
        y la entrada en el registro (ver Componente 4 para detalles)
     c. Referencia el componente en config.json por su ID (no por path)

4.5. VOICEOVER (solo con --voiceover)
   - Genera texto de narración por escena
   - Ejecuta: npx tsx scripts/generate-voiceover.ts tutorials/[slug]/config.json
   - El script llama ElevenLabs API y escribe MP3s en public/voiceover/[slug]/
   - El config.json se actualiza con las duraciones reales del audio

5. RENDER
   - Ejecuta: npx tsx scripts/render.ts tutorials/[slug]/config.json
   - El script bundlea la composición y renderiza el MP4
   - Output: tutorials/[slug]/output.mp4

6. SUMMARY
   - Claude muestra: escenas generadas, duración total, ruta del vídeo
   - Ofrece ajustes si el usuario quiere cambiar algo
```

### Invocación

```bash
/tutorial-generator "explica /compact en Claude Code"
/tutorial-generator "muestra cómo usar hooks" --voiceover
/tutorial-generator "https://docs.anthropic.com/..." "explica esta feature"
/tutorial-generator "explica /compact" --no-demo   # omite el subagente de demo
```

---

## Componente 2: El Zod Schema (`schema.ts`)

Zod schema real — contrato entre el agente (genera JSON) y el template (renderiza).

```typescript
import { z } from "zod"

const IntroSceneSchema = z.object({
  type: z.literal("intro"),
  title: z.string(),
  subtitle: z.string().optional(),
  durationInSeconds: z.number().min(1).max(30),
})

const TerminalLineSchema = z.object({
  kind: z.enum(["command", "output", "claude", "blank"]),
  text: z.string(),
  delayAfterMs: z.number().min(0).optional(),
})

const TerminalSceneSchema = z.object({
  type: z.literal("terminal"),
  title: z.string().optional(),
  lines: z.array(TerminalLineSchema).min(1),
  durationInSeconds: z.number().min(2).max(120),
})

// CalloutScene: escena autónoma que muestra un callout animado.
// Para que se vea "sobre" la terminal anterior, el agente debe usar
// durationInSeconds cortos (2-4s) y el template usa fondo semi-transparente.
const CalloutSceneSchema = z.object({
  type: z.literal("callout"),
  text: z.string(),
  position: z.enum(["top", "bottom", "right"]),
  background: z.enum(["overlay", "solid"]).default("overlay"),
  durationInSeconds: z.number().min(1).max(15),
})

const OutroSceneSchema = z.object({
  type: z.literal("outro"),
  title: z.string(),
  bullets: z.array(z.string()).optional(),
  durationInSeconds: z.number().min(2).max(20),
})

// CustomScene referencia un componente por su ID en el registro,
// NO por path de archivo. Remotion no soporta imports dinámicos en runtime.
const CustomSceneSchema = z.object({
  type: z.literal("custom"),
  componentId: z.string(), // Clave en customSceneRegistry.ts
  durationInSeconds: z.number().min(1).max(120),
  props: z.record(z.unknown()).optional(),
})

export const TutorialConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  fps: z.literal(30),
  width: z.literal(1280),
  height: z.literal(720),
  scenes: z
    .array(
      z.discriminatedUnion("type", [
        IntroSceneSchema,
        TerminalSceneSchema,
        CalloutSceneSchema,
        OutroSceneSchema,
        CustomSceneSchema,
      ]),
    )
    .min(1),
  voiceover: z
    .object({
      enabled: z.literal(true),
      voiceId: z.string(),
      scenes: z.record(z.string()), // sceneIndex (string) → texto narrado
    })
    .optional(),
})

export type TutorialConfig = z.infer<typeof TutorialConfigSchema>
```

---

## Componente 3: `calculateMetadata.ts`

Calcula la duración total sumando todas las escenas. Esto garantiza que el vídeo tenga exactamente la duración del contenido, sin frames muertos.

```typescript
// src/compositions/ClaudeCodeTutorial/calculateMetadata.ts
import { CalculateMetadataFunction } from "remotion"
import { TutorialConfig } from "./schema"

export const calculateMetadata: CalculateMetadataFunction<TutorialConfig> = async ({ props }) => {
  const totalSeconds = props.scenes.reduce((sum, scene) => sum + scene.durationInSeconds, 0)
  return {
    durationInFrames: Math.ceil(totalSeconds * props.fps),
    fps: props.fps,
    width: props.width,
    height: props.height,
  }
}
```

Se registra en `Root.tsx` en el `<Composition>` de `ClaudeCodeTutorial`:

```tsx
// En Root.tsx — el agente DEBE añadir esta entrada al registrar la composición
import { ClaudeCodeTutorial } from "./compositions/ClaudeCodeTutorial/ClaudeCodeTutorial"
import { calculateMetadata } from "./compositions/ClaudeCodeTutorial/calculateMetadata"
import { TutorialConfigSchema } from "./compositions/ClaudeCodeTutorial/schema"

// Dentro de RemotionRoot:
;<Composition
  id="ClaudeCodeTutorial"
  component={ClaudeCodeTutorial}
  durationInFrames={300} // Fallback — calculateMetadata lo sobreescribe
  fps={30}
  width={1280}
  height={720}
  schema={TutorialConfigSchema}
  defaultProps={
    {
      /* props mínimas válidas */
    }
  }
  calculateMetadata={calculateMetadata}
/>
```

---

## Componente 4: El Template Remotion (Escenas)

### `TerminalScene.tsx` — el componente estrella

Renderiza una ventana de terminal simulada con:

- **Chrome de ventana**: barra de título, tres puntos (rojo/amarillo/verde)
- **Prompt**: `user@machine ~/proyecto $` con cursor parpadeante
- **Comandos** (`kind: "command"`): typewriter via string slicing (nunca CSS transitions)
- **Output** (`kind: "output"`): aparece instantáneamente en bloque
- **Respuestas Claude** (`kind: "claude"`): aparecen línea a línea con `<Sequence>` por línea
- **Blank**: línea vacía de separación

**Convenciones visuales:**

- Fondo ventana: `#0d1117`
- Texto comando: `#7ee787` (verde)
- Texto output: `#c9d1d9` (gris claro)
- Texto Claude: `#79c0ff` (azul)
- Fuente: `JetBrains Mono` via `@remotion/google-fonts`
- Ventana: 90% del ancho del frame, bordes redondeados, sombra

### `CalloutScene.tsx`

Escena autónoma con fondo configurable:

- `"overlay"`: fondo semi-transparente oscuro (como si flotara sobre la terminal anterior)
- `"solid"`: fondo sólido para callouts independientes

Caja de texto animada que entra con spring desde el lado indicado (`position`).

### `CustomScene.tsx`

Wrapper que lee `componentId` y busca el componente en `customSceneRegistry.ts`:

```tsx
import { customSceneRegistry } from "../customSceneRegistry"

export const CustomScene: React.FC<CustomSceneProps> = ({ componentId, props }) => {
  const Component = customSceneRegistry[componentId]
  if (!Component) throw new Error(`CustomScene: componentId "${componentId}" not found in registry`)
  return <Component {...props} />
}
```

---

## Componente 5: `customSceneRegistry.ts`

Registro estático de todos los componentes custom. Remotion bundlea en tiempo de compilación — no hay imports dinámicos en runtime. Cuando el agente crea una escena custom, **debe actualizar este archivo**:

```typescript
// src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
import { type FC } from "react"

// El agente añade imports aquí cuando genera escenas custom:
// import { MiEscenaCustom } from "./scenes/custom/MiEscenaCustom"

export const customSceneRegistry: Record<string, FC<Record<string, unknown>>> = {
  // El agente añade entradas aquí:
  // "mi-escena-custom": MiEscenaCustom,
}
```

---

## Componente 6: `scripts/render.ts`

```typescript
// scripts/render.ts
// Uso: npx tsx scripts/render.ts tutorials/[slug]/config.json

import { bundle } from "@remotion/bundler" // @remotion/bundler — ver deps
import { renderMedia, selectComposition } from "@remotion/renderer"
import { readFileSync } from "fs"
import path from "path"

const configPath = process.argv[2]
if (!configPath) throw new Error("Uso: npx tsx scripts/render.ts tutorials/[slug]/config.json")

const config = JSON.parse(readFileSync(configPath, "utf-8"))
const outputPath = path.join(path.dirname(configPath), "output.mp4")

// IMPORTANTE: el config file de Remotion NO aplica en las Node.js APIs.
// Hay que pasar el webpackOverride manualmente para que Tailwind compile.
import { enableTailwind } from "@remotion/tailwind-v4"

console.log(`Bundling composición...`)
const bundleLocation = await bundle({
  entryPoint: path.resolve("./src/index.ts"),
  webpackOverride: enableTailwind,
})

console.log(`Seleccionando composición ClaudeCodeTutorial...`)
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: "ClaudeCodeTutorial",
  inputProps: config,
})

console.log(`Renderizando ${composition.durationInFrames} frames...`)
await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: "h264",
  outputLocation: outputPath,
  inputProps: config,
})

console.log(`✓ Vídeo generado: ${outputPath}`)
```

---

## Dependencias

### Instaladas

| Paquete                         | Tipo       | Uso                                  |
| ------------------------------- | ---------- | ------------------------------------ |
| `remotion@4.0.438`              | dep        | Core                                 |
| `@remotion/cli@4.0.438`         | dep        | Studio + CLI                         |
| `@remotion/renderer@4.0.438`    | **devDep** | Render programático (solo uso local) |
| `@remotion/transitions@4.0.438` | dep        | TransitionSeries                     |
| `@remotion/tailwind-v4@4.0.438` | dep        | TailwindCSS                          |
| `zod`                           | dep        | Schema validation                    |

### Pendientes de instalar

| Paquete                  | Tipo   | Cuándo                                        |
| ------------------------ | ------ | --------------------------------------------- |
| `@remotion/bundler`      | devDep | Al implementar render.ts                      |
| `tsx`                    | devDep | Al implementar scripts/                       |
| `@remotion/google-fonts` | dep    | Al implementar TerminalScene (JetBrains Mono) |

---

## .gitignore additions

```
# Vídeos generados (binarios grandes)
tutorials/*/output.mp4
public/voiceover/
```

Los `config.json` sí se commitean — son el source of truth del tutorial.

---

## Extensibilidad futura

| Agente futuro            | Carpeta base            | Descripción                  |
| ------------------------ | ----------------------- | ---------------------------- |
| `presentation-generator` | `presentations/[slug]/` | Slides con charts y datos    |
| `explainer-generator`    | `explainers/[slug]/`    | Animaciones tipo 3Blue1Brown |
| `social-clip-generator`  | `clips/[slug]/`         | Vertical, subtítulos TikTok  |

Cada agente: su propia skill en `skills/[nombre]/`, su composición en `src/compositions/[Nombre]/`, su carpeta de output.

---

## Criterios de éxito

1. `/tutorial-generator "explica /compact"` produce un MP4 sin intervención manual
2. El vídeo contiene al menos: intro, escena terminal, callout, outro
3. La terminal muestra typewriter en comandos, aparición instantánea en output
4. El tutorial se organiza en `tutorials/compact-command/config.json` + `output.mp4`
5. Re-ejecutar el render script con el mismo `config.json` produce el mismo vídeo (determinismo)
6. Los `config.json` son legibles y editables manualmente sin conocer React
