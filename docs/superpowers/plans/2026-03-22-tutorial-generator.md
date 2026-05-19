# Tutorial Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Claude Code skill (`/tutorial-generator`) that, given a natural language instruction, researches a Claude Code feature and renders an animated educational MP4 video using a parametrizable Remotion template.

**Architecture:** A Zod-validated JSON config drives a Remotion composition (`ClaudeCodeTutorial`) that renders scenes using `<Series>`. The skill file (`skills/tutorial-generator/index.md`) instructs Claude Code to research, produce the config, and invoke `scripts/render.ts` via Bash. Duration is dynamic via `calculateMetadata`.

**Tech Stack:** Remotion 4.0.438, React 19, TypeScript, Zod v4, @remotion/renderer, @remotion/bundler, @remotion/google-fonts, tsx

---

## File Map

| File                                                           | Action | Responsibility                                          |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| `src/compositions/ClaudeCodeTutorial/schema.ts`                | Create | Zod schema — contrato JSON entre skill y template       |
| `src/compositions/ClaudeCodeTutorial/calculateMetadata.ts`     | Create | Duración dinámica sumando escenas                       |
| `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`   | Create | Registro estático de componentes custom                 |
| `src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx`    | Create | Slide de título animado                                 |
| `src/compositions/ClaudeCodeTutorial/scenes/TerminalScene.tsx` | Create | Terminal simulada — el componente estrella              |
| `src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx`  | Create | Callout overlay animado                                 |
| `src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx`    | Create | Slide de cierre con bullets                             |
| `src/compositions/ClaudeCodeTutorial/scenes/CustomScene.tsx`   | Create | Wrapper que lee componentId del registry                |
| `src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx`   | Create | Composición raíz — mapea config.scenes a Series         |
| `src/Root.tsx`                                                 | Modify | Añadir registro de ClaudeCodeTutorial                   |
| `scripts/render.ts`                                            | Create | CLI script: bundle + renderMedia                        |
| `skills/tutorial-generator/index.md`                           | Create | Skill de Claude Code — instrucciones del agente         |
| `.gitignore`                                                   | Modify | Ignorar tutorials/\*/output.mp4 y public/voiceover/     |
| `package.json`                                                 | Modify | Instalar @remotion/bundler, tsx, @remotion/google-fonts |

---

## Task 1: Instalar dependencias pendientes

**Files:** `package.json`

- [ ] **Step 1.1: Instalar paquetes**

```bash
cd /Users/enriquebook/Personal/Developer/remotion-playground
npm install @remotion/google-fonts
npm install --save-dev @remotion/bundler tsx
```

Expected: exit 0, paquetes aparecen en `package.json`

- [ ] **Step 1.2: Verificar**

```bash
npx tsx --version && node -e "require('@remotion/bundler'); console.log('OK')"
```

Expected: versión de tsx + `OK`

- [ ] **Step 1.3: Actualizar .gitignore**

Añadir al final de `.gitignore` (crearlo si no existe):

```
# Vídeos generados — binarios grandes, no trackear
tutorials/*/output.mp4
public/voiceover/
```

- [ ] **Step 1.4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add bundler, tsx, google-fonts deps for tutorial generator"
```

---

## Task 2: Zod Schema

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/schema.ts`

- [ ] **Step 2.1: Crear directorio**

```bash
mkdir -p src/compositions/ClaudeCodeTutorial/scenes/custom
```

- [ ] **Step 2.2: Escribir schema.ts**

```typescript
// src/compositions/ClaudeCodeTutorial/schema.ts
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

const CustomSceneSchema = z.object({
  type: z.literal("custom"),
  componentId: z.string(),
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
      scenes: z.record(z.string()),
    })
    .optional(),
})

export type TutorialConfig = z.infer<typeof TutorialConfigSchema>
export type TerminalLine = z.infer<typeof TerminalLineSchema>
```

- [ ] **Step 2.3: Validar que el schema compila**

```bash
npx tsc --noEmit
```

Expected: sin errores relacionados con schema.ts

- [ ] **Step 2.4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/schema.ts
git commit -m "feat: add Zod schema for ClaudeCodeTutorial config"
```

---

## Task 3: calculateMetadata

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/calculateMetadata.ts`

- [ ] **Step 3.1: Escribir calculateMetadata.ts**

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

- [ ] **Step 3.2: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores

- [ ] **Step 3.3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/calculateMetadata.ts
git commit -m "feat: add calculateMetadata for dynamic tutorial duration"
```

---

## Task 4: customSceneRegistry

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 4.1: Escribir customSceneRegistry.ts**

```typescript
// src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
// IMPORTANTE: Remotion bundlea en tiempo de compilación. Todos los componentes custom
// deben estar registrados aquí con un import estático. NO usar imports dinámicos.
//
// Cuando el skill genera una escena custom:
//   1. Escribe el componente en scenes/custom/[NombreComponente].tsx
//   2. Añade: import { NombreComponente } from "./scenes/custom/NombreComponente"
//   3. Añade: "nombre-componente": NombreComponente, en el objeto de abajo

import { type FC } from "react"

export const customSceneRegistry: Record<string, FC<Record<string, unknown>>> = {
  // Ejemplo (descomentar cuando el skill genere el componente):
  // "mi-escena": MiEscena,
}
```

- [ ] **Step 4.2: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat: add customSceneRegistry for escape-hatch custom scenes"
```

---

## Task 5: IntroScene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx`

- [ ] **Step 5.1: Escribir IntroScene.tsx**

```tsx
// src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { TutorialConfigSchema } from "../schema"

type IntroSceneProps = Extract<z.infer<typeof TutorialConfigSchema>["scenes"][number], { type: "intro" }>

export const IntroScene: React.FC<IntroSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: fps })
  const titleY = interpolate(titleSpring, [0, 1], [40, 0])
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  const subtitleOpacity = interpolate(frame, [fps * 0.5, fps * 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const subtitleY = interpolate(frame, [fps * 0.5, fps * 1], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Línea decorativa que se expande
  const lineWidth = interpolate(frame, [fps * 0.2, fps * 0.8], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      {/* Etiqueta "Claude Code" */}
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#7ee787",
          opacity: titleOpacity,
        }}
      >
        Claude Code · Tutorial
      </div>

      {/* Título */}
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 56,
          fontWeight: 800,
          color: "#f0f6fc",
          textAlign: "center",
          maxWidth: 900,
          lineHeight: 1.2,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>

      {/* Línea decorativa */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: "linear-gradient(90deg, #7ee787, #79c0ff)",
          borderRadius: 1,
        }}
      />

      {/* Subtítulo */}
      {subtitle && (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 22,
            color: "#8b949e",
            textAlign: "center",
            maxWidth: 700,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 5.2: Verificar compilación**

```bash
npx tsc --noEmit
```

- [ ] **Step 5.3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx
git commit -m "feat: add IntroScene with spring title animation"
```

---

## Task 6: TerminalScene (componente estrella)

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/TerminalScene.tsx`

`TerminalScene` precalcula un `startFrame` acumulativo para cada línea. Las líneas de tipo `command` usan typewriter (string slicing). Las de `output` aparecen instantáneamente. Las de `claude` aparecen línea a línea.

- [ ] **Step 6.1: Escribir TerminalScene.tsx**

```tsx
// src/compositions/ClaudeCodeTutorial/scenes/TerminalScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion"
import { loadFont } from "@remotion/google-fonts/JetBrainsMono"
import { z } from "zod"
import { TutorialConfigSchema, TerminalLine } from "../schema"

const { fontFamily } = loadFont("normal", { weights: ["400", "700"] })

// Velocidades en frames (a 30fps)
const COMMAND_CHARS_PER_FRAME = 2 // typewriter speed
const OUTPUT_REVEAL_FRAMES = 4 // pequeña pausa antes de mostrar output
const CLAUDE_LINE_GAP_FRAMES = 12 // gap entre líneas de Claude
const CLAUDE_CHARS_PER_FRAME = 3 // velocidad de "streaming" de Claude

type TerminalSceneProps = Extract<z.infer<typeof TutorialConfigSchema>["scenes"][number], { type: "terminal" }> & {
  fps: number
}

type LineWithTiming = TerminalLine & {
  startFrame: number
  durationFrames: number
}

function buildLineTiming(lines: TerminalLine[]): LineWithTiming[] {
  let cursor = 0
  return lines.map((line) => {
    const start = cursor
    let duration = 0
    if (line.kind === "command") {
      duration = Math.ceil(line.text.length / COMMAND_CHARS_PER_FRAME) + OUTPUT_REVEAL_FRAMES
    } else if (line.kind === "claude") {
      duration = Math.ceil(line.text.length / CLAUDE_CHARS_PER_FRAME) + CLAUDE_LINE_GAP_FRAMES
    } else {
      // output, blank: aparece instantáneo, ocupa pocos frames
      duration = OUTPUT_REVEAL_FRAMES
    }
    // delayAfterMs → frames (asume 30fps)
    const delayFrames = line.delayAfterMs ? Math.ceil(line.delayAfterMs / (1000 / 30)) : 0
    cursor = start + duration + delayFrames
    return { ...line, startFrame: start, durationFrames: duration }
  })
}

const TerminalLine: React.FC<{ line: LineWithTiming; frame: number }> = ({ line, frame }) => {
  const localFrame = frame - line.startFrame
  if (localFrame < 0) return null

  const colors: Record<TerminalLine["kind"], string> = {
    command: "#7ee787",
    output: "#c9d1d9",
    claude: "#79c0ff",
    blank: "transparent",
  }

  let displayText = line.text
  if (line.kind === "command") {
    const chars = Math.floor(localFrame * COMMAND_CHARS_PER_FRAME)
    displayText = line.text.slice(0, chars)
  } else if (line.kind === "claude") {
    const chars = Math.floor(localFrame * CLAUDE_CHARS_PER_FRAME)
    displayText = line.text.slice(0, chars)
  }

  const prefix = line.kind === "command" ? "$ " : line.kind === "claude" ? "  " : "  "

  return (
    <div
      style={{
        fontFamily,
        fontSize: 15,
        lineHeight: "24px",
        color: colors[line.kind],
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {line.kind === "blank" ? "\u00A0" : `${prefix}${displayText}`}
    </div>
  )
}

export const TerminalScene: React.FC<TerminalSceneProps> = ({ title, lines }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const timedLines = buildLineTiming(lines)

  // Ventana aparece con spring
  const windowSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })
  const windowOpacity = interpolate(windowSpring, [0, 1], [0, 1])
  const windowY = interpolate(windowSpring, [0, 1], [20, 0])

  // Cursor parpadeante (solo visible si el último comando aún está escribiendo)
  const lastCommand = [...timedLines].reverse().find((l) => l.kind === "command")
  const lastCommandDone = lastCommand ? frame >= lastCommand.startFrame + lastCommand.durationFrames : true
  const cursorVisible = !lastCommandDone && Math.floor(frame / 15) % 2 === 0

  return (
    <AbsoluteFill
      style={{
        background: "#0d1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 18,
            color: "#8b949e",
            marginBottom: 24,
            alignSelf: "flex-start",
            width: "90%",
          }}
        >
          {title}
        </div>
      )}

      {/* Ventana de terminal */}
      <div
        style={{
          width: "90%",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          opacity: windowOpacity,
          transform: `translateY(${windowY}px)`,
        }}
      >
        {/* Chrome — barra de título */}
        <div
          style={{
            height: 36,
            background: "#21262d",
            display: "flex",
            alignItems: "center",
            paddingLeft: 14,
            gap: 8,
          }}
        >
          {["#ff5f57", "#febc2e", "#28c840"].map((color, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
          ))}
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
              fontSize: 12,
              color: "#6e7681",
              marginRight: 52,
            }}
          >
            bash
          </div>
        </div>

        {/* Contenido */}
        <div
          style={{
            background: "#0d1117",
            padding: "20px 24px",
            minHeight: 280,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {timedLines.map((line, i) => (
            <TerminalLine key={i} line={line} frame={frame} />
          ))}
          {/* Cursor */}
          {cursorVisible && (
            <div
              style={{
                width: 8,
                height: 18,
                background: "#7ee787",
                display: "inline-block",
                marginTop: 2,
              }}
            />
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 6.2: Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: sin errores

- [ ] **Step 6.3: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/TerminalScene.tsx
git commit -m "feat: add TerminalScene with typewriter and streaming effects"
```

---

## Task 7: CalloutScene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx`

- [ ] **Step 7.1: Escribir CalloutScene.tsx**

```tsx
// src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { TutorialConfigSchema } from "../schema"

type CalloutSceneProps = Extract<z.infer<typeof TutorialConfigSchema>["scenes"][number], { type: "callout" }>

const ORIGIN: Record<"top" | "bottom" | "right", { x: number; y: number }> = {
  top: { x: 0, y: -30 },
  bottom: { x: 0, y: 30 },
  right: { x: 40, y: 0 },
}

export const CalloutScene: React.FC<CalloutSceneProps> = ({ text, position, background }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const enterSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 }, durationInFrames: fps * 0.6 })
  const origin = ORIGIN[position]
  const tx = interpolate(enterSpring, [0, 1], [origin.x, 0])
  const ty = interpolate(enterSpring, [0, 1], [origin.y, 0])
  const opacity = interpolate(enterSpring, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })

  const justify = position === "right" ? "flex-end" : "center"
  const align = position === "top" ? "flex-start" : position === "bottom" ? "flex-end" : "center"

  return (
    <AbsoluteFill
      style={{
        background: background === "overlay" ? "rgba(0,0,0,0.65)" : "#0d1117",
        display: "flex",
        alignItems: align,
        justifyContent: justify,
        padding: 80,
      }}
    >
      <div
        style={{
          maxWidth: 640,
          background: "linear-gradient(135deg, #161b22 0%, #21262d 100%)",
          border: "1px solid #30363d",
          borderLeft: "4px solid #7ee787",
          borderRadius: 10,
          padding: "28px 36px",
          opacity,
          transform: `translate(${tx}px, ${ty}px)`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 22,
            lineHeight: 1.5,
            color: "#f0f6fc",
            fontWeight: 500,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 7.2: Verificar compilación y commit**

```bash
npx tsc --noEmit
git add src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx
git commit -m "feat: add CalloutScene with spring entrance"
```

---

## Task 8: OutroScene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx`

- [ ] **Step 8.1: Escribir OutroScene.tsx**

```tsx
// src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { TutorialConfigSchema } from "../schema"

type OutroSceneProps = Extract<z.infer<typeof TutorialConfigSchema>["scenes"][number], { type: "outro" }>

export const OutroScene: React.FC<OutroSceneProps> = ({ title, bullets }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: fps * 0.8 })
  const titleOpacity = interpolate(titleSpring, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [30, 0])

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        gap: 32,
      }}
    >
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 48,
          fontWeight: 800,
          color: "#f0f6fc",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
        }}
      >
        {title}
      </div>

      {bullets && bullets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 700 }}>
          {bullets.map((bullet, i) => {
            const bulletOpacity = interpolate(frame, [fps * (0.5 + i * 0.25), fps * (0.9 + i * 0.25)], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
            const bulletX = interpolate(frame, [fps * (0.5 + i * 0.25), fps * (0.9 + i * 0.25)], [-20, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  opacity: bulletOpacity,
                  transform: `translateX(${bulletX}px)`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#7ee787",
                    flexShrink: 0,
                    marginTop: 8,
                  }}
                />
                <div
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 20,
                    color: "#8b949e",
                    lineHeight: 1.5,
                  }}
                >
                  {bullet}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Badge de Claude Code */}
      <div
        style={{
          marginTop: 16,
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          color: "#484f58",
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: interpolate(frame, [fps * 1.5, fps * 2], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Claude Code Tutorials
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 8.2: Verificar compilación y commit**

```bash
npx tsc --noEmit
git add src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx
git commit -m "feat: add OutroScene with staggered bullet animations"
```

---

## Task 9: CustomScene

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/CustomScene.tsx`

- [ ] **Step 9.1: Escribir CustomScene.tsx**

```tsx
// src/compositions/ClaudeCodeTutorial/scenes/CustomScene.tsx
import React from "react"
import { customSceneRegistry } from "../customSceneRegistry"

interface CustomSceneProps {
  componentId: string
  props?: Record<string, unknown>
}

export const CustomScene: React.FC<CustomSceneProps> = ({ componentId, props = {} }) => {
  const Component = customSceneRegistry[componentId]
  if (!Component) {
    // Fallback visual en lugar de crash — útil durante desarrollo
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1c1c",
          color: "#ff6b6b",
          fontFamily: "monospace",
          fontSize: 18,
        }}
      >
        ⚠ CustomScene: "{componentId}" no encontrado en customSceneRegistry
      </div>
    )
  }
  return <Component {...props} />
}
```

- [ ] **Step 9.2: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/CustomScene.tsx
git commit -m "feat: add CustomScene wrapper with registry lookup"
```

---

## Task 10: ClaudeCodeTutorial (composición raíz)

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx`

- [ ] **Step 10.1: Escribir ClaudeCodeTutorial.tsx**

```tsx
// src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx
import React from "react"
import { AbsoluteFill, Series } from "remotion"
import { TutorialConfig } from "./schema"
import { IntroScene } from "./scenes/IntroScene"
import { TerminalScene } from "./scenes/TerminalScene"
import { CalloutScene } from "./scenes/CalloutScene"
import { OutroScene } from "./scenes/OutroScene"
import { CustomScene } from "./scenes/CustomScene"

export const ClaudeCodeTutorial: React.FC<TutorialConfig> = (config) => {
  return (
    <AbsoluteFill style={{ background: "#0d1117" }}>
      <Series>
        {config.scenes.map((scene, i) => {
          const durationInFrames = Math.ceil(scene.durationInSeconds * config.fps)
          return (
            <Series.Sequence key={i} durationInFrames={durationInFrames}>
              {scene.type === "intro" && <IntroScene {...scene} />}
              {scene.type === "terminal" && <TerminalScene {...scene} fps={config.fps} />}
              {scene.type === "callout" && <CalloutScene {...scene} />}
              {scene.type === "outro" && <OutroScene {...scene} />}
              {scene.type === "custom" && <CustomScene {...scene} />}
            </Series.Sequence>
          )
        })}
      </Series>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 10.2: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/ClaudeCodeTutorial.tsx
git commit -m "feat: add ClaudeCodeTutorial root composition with Series scene routing"
```

---

## Task 11: Registrar en Root.tsx

**Files:**

- Modify: `src/Root.tsx`

- [ ] **Step 11.1: Añadir ClaudeCodeTutorial a Root.tsx**

Leer el archivo actual y añadir los imports y el `<Composition>` dentro de `RemotionRoot`. El resultado debe ser:

```tsx
import "./index.css"
import React from "react"
import { Composition } from "remotion"
import { MyComposition } from "./Composition"
import { ClaudeCodeTutorial } from "./compositions/ClaudeCodeTutorial/ClaudeCodeTutorial"
import { calculateMetadata } from "./compositions/ClaudeCodeTutorial/calculateMetadata"
import { TutorialConfigSchema } from "./compositions/ClaudeCodeTutorial/schema"

const defaultTutorialProps = {
  id: "default",
  title: "Tutorial",
  description: "",
  fps: 30 as const,
  width: 1280 as const,
  height: 720 as const,
  scenes: [{ type: "intro" as const, title: "Tutorial", durationInSeconds: 3 }],
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="MyComp" component={MyComposition} durationInFrames={60} fps={30} width={1280} height={720} />
      <Composition
        id="ClaudeCodeTutorial"
        component={ClaudeCodeTutorial}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        schema={TutorialConfigSchema}
        defaultProps={defaultTutorialProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  )
}
```

- [ ] **Step 11.2: Verificar que el Remotion Studio muestra la composición**

```bash
# El servidor ya está corriendo en :3001 — abrir localhost:3001
# Verificar que aparece "ClaudeCodeTutorial" en el listado de composiciones
npx tsc --noEmit
```

Expected: sin errores TypeScript, composición visible en el Studio

- [ ] **Step 11.3: Commit**

```bash
git add src/Root.tsx
git commit -m "feat: register ClaudeCodeTutorial in Root.tsx with calculateMetadata"
```

---

## Task 12: Smoke test con config.json manual

**Files:**

- Create: `tutorials/compact-command/config.json` (temporal para test)

- [ ] **Step 12.1: Crear config.json de prueba**

```bash
mkdir -p tutorials/compact-command
```

Crear `tutorials/compact-command/config.json`:

```json
{
  "id": "compact-command",
  "title": "El comando /compact",
  "description": "Cómo usar /compact para comprimir el contexto de Claude Code",
  "fps": 30,
  "width": 1280,
  "height": 720,
  "scenes": [
    {
      "type": "intro",
      "title": "El comando /compact",
      "subtitle": "Comprime el contexto sin perder el hilo",
      "durationInSeconds": 4
    },
    {
      "type": "terminal",
      "title": "Uso básico",
      "lines": [
        { "kind": "command", "text": "claude" },
        { "kind": "claude", "text": "> Hola, ¿en qué puedo ayudarte hoy?" },
        { "kind": "blank", "text": "" },
        { "kind": "command", "text": "/compact" },
        { "kind": "output", "text": "⠋ Comprimiendo contexto..." },
        { "kind": "output", "text": "✓ Contexto comprimido. Tokens usados: 1,200 → 340" }
      ],
      "durationInSeconds": 8
    },
    {
      "type": "callout",
      "text": "/compact resume toda la conversación anterior en un resumen compacto. Ideal cuando el contexto está lleno pero quieres seguir trabajando.",
      "position": "bottom",
      "background": "overlay",
      "durationInSeconds": 5
    },
    {
      "type": "outro",
      "title": "Resumen",
      "bullets": [
        "Usa /compact cuando el contexto esté casi lleno",
        "No pierdes el hilo — solo se comprime",
        "Puedes ver cuántos tokens ahorraste"
      ],
      "durationInSeconds": 6
    }
  ]
}
```

- [ ] **Step 12.2: Verificar que el Studio lo previsualiza**

En el Remotion Studio (localhost:3001), seleccionar `ClaudeCodeTutorial`.
El Studio usa `defaultProps` por ahora — para ver el config.json habrá que usar el render script.

- [ ] **Step 12.3: Commit del config.json de prueba**

```bash
git add tutorials/compact-command/config.json
git commit -m "test: add smoke test config for compact-command tutorial"
```

---

## Task 13: scripts/render.ts

**Files:**

- Create: `scripts/render.ts`

- [ ] **Step 13.1: Crear directorio scripts/**

```bash
mkdir -p scripts
```

- [ ] **Step 13.2: Escribir render.ts**

```typescript
// scripts/render.ts
// Uso: npx tsx scripts/render.ts tutorials/[slug]/config.json

import { bundle } from "@remotion/bundler"
import { renderMedia, selectComposition } from "@remotion/renderer"
import { enableTailwind } from "@remotion/tailwind-v4"
import { readFileSync } from "fs"
import path from "path"

const configPath = process.argv[2]
if (!configPath) {
  console.error("Uso: npx tsx scripts/render.ts tutorials/[slug]/config.json")
  process.exit(1)
}

const config = JSON.parse(readFileSync(configPath, "utf-8"))
const outputPath = path.join(path.dirname(configPath), "output.mp4")

console.log(`📦 Bundling composición...`)
const bundleLocation = await bundle({
  entryPoint: path.resolve("./src/index.ts"),
  // IMPORTANTE: remotion.config.ts NO aplica en Node.js APIs — pasar override manual
  webpackOverride: enableTailwind,
})

console.log(`🔍 Seleccionando composición ClaudeCodeTutorial...`)
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: "ClaudeCodeTutorial",
  inputProps: config,
})

console.log(`🎬 Renderizando ${composition.durationInFrames} frames...`)
await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: "h264",
  outputLocation: outputPath,
  inputProps: config,
  onProgress: ({ progress }) => {
    process.stdout.write(`\r  ${Math.round(progress * 100)}%`)
  },
})

console.log(`\n✅ Vídeo generado: ${outputPath}`)
```

- [ ] **Step 13.3: Ejecutar render de smoke test**

```bash
npx tsx scripts/render.ts tutorials/compact-command/config.json
```

Expected: progreso 0%→100%, archivo `tutorials/compact-command/output.mp4` creado

Si falla con error de Chromium/browser: instalar con `npx remotion browser ensure`

- [ ] **Step 13.4: Verificar el vídeo**

```bash
open tutorials/compact-command/output.mp4
```

Expected: vídeo de ~23 segundos con intro, terminal, callout y outro

- [ ] **Step 13.5: Commit**

```bash
git add scripts/render.ts
git commit -m "feat: add render.ts script for programmatic MP4 generation"
```

---

## Task 14: Skill `tutorial-generator`

**Files:**

- Create: `skills/tutorial-generator/index.md`

Este es el archivo que Claude Code carga cuando el usuario invoca `/tutorial-generator`. Contiene las instrucciones en prosa que guían al agente.

- [ ] **Step 14.1: Crear el skill**

```bash
mkdir -p skills/tutorial-generator
```

Crear `skills/tutorial-generator/index.md`:

````markdown
---
name: tutorial-generator
description: Genera vídeos educativos de Claude Code features usando Remotion. Invoca con /tutorial-generator "instrucción" [--voiceover] [--no-demo]
---

# Tutorial Generator

Genera un vídeo MP4 educativo sobre una feature de Claude Code con terminal simulada.

## Cuando se te invoca

El usuario te pasa una instrucción en lenguaje natural. Puede incluir:

- Un tema: `/tutorial-generator "explica /compact"`
- Una URL de referencia + tema: `/tutorial-generator "https://docs.anthropic.com/..." "explica esta feature"`
- Flags: `--voiceover` (activa ElevenLabs TTS), `--no-demo` (omite el subagente de demostración)

## Reglas de parsing

- Si el primer argumento empieza por `https?://`, es una URL de referencia; el resto es el tema.
- Genera un slug limpio del tema: minúsculas, sin espacios, sin caracteres especiales. Ejemplo: "comando /compact" → `compact-command`.
- Crea la carpeta `tutorials/[slug]/` y `tutorials/[slug]/assets/`.

## Paso 1: Research

Lanza en paralelo:

- **Context7 MCP** → busca la feature en documentación de Claude Code / Anthropic
- **WebSearch** → busca ejemplos, posts, guías relacionadas
- **WebFetch** → si se pasó una URL, léela directamente

Lee también `skills/remotion-best-practices/` para entender qué tipos de escenas y efectos puedes usar en el template.

## Paso 2: Demo subagente (por defecto activo, omitir con --no-demo)

Lanza un subagente con esta instrucción exacta:

> "Eres un agente de demostración. Documenta el uso real de esta feature de Claude Code: [tema].
> Responde SOLO con este formato:
> COMANDOS EXACTOS: [lista de comandos, uno por línea]
> OUTPUT REAL: [output literal que produce la herramienta, tal como aparece en la terminal]
> CASOS DE USO: [2-3 situaciones donde es útil]
> ERRORES COMUNES: [1-2 errores típicos del usuario]
> NOTAS: [cualquier comportamiento inesperado o matiz importante]"

Usa la respuesta estructurada del subagente como fuente de verdad para los comandos y outputs del tutorial.

## Paso 3: Genera config.json

Con toda la información recopilada, escribe `tutorials/[slug]/config.json`.

El JSON debe ser válido según el schema en `src/compositions/ClaudeCodeTutorial/schema.ts`.

### Estructura mínima de un buen tutorial:

1. `intro` (3-5s): título llamativo que explique qué va a aprender el usuario
2. `terminal` (6-15s): demostración real del comando con líneas de tipo command, output, claude
3. `callout` (3-5s): explicación del "por qué" o "cuándo usar" en lenguaje natural
4. `outro` (4-8s): resumen con bullets accionables

### Reglas para el tipo "terminal":

- `kind: "command"` → lo que escribe el usuario (usa los comandos exactos del subagente)
- `kind: "output"` → respuesta inmediata del sistema
- `kind: "claude"` → respuesta de Claude (aparece como streaming)
- `kind: "blank"` → separador visual entre grupos de líneas
- Usa `delayAfterMs` para pausas dramáticas (ej: 800ms antes de que aparezca el output)

### Si necesitas una escena custom (escape hatch):

1. Escribe el componente React en `src/compositions/ClaudeCodeTutorial/scenes/custom/[NombreComponente].tsx`
2. Añade el import y la entrada en `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`
3. Referencia en config.json con `"type": "custom", "componentId": "nombre-componente"`

## Paso 4: Renderizar

Ejecuta:

```bash
npx tsx scripts/render.ts tutorials/[slug]/config.json
```
````

Si falla con error de browser/Chromium:

```bash
npx remotion browser ensure
npx tsx scripts/render.ts tutorials/[slug]/config.json
```

## Paso 5: Resumen

Informa al usuario:

- Escenas generadas (tipos y duraciones)
- Duración total del vídeo
- Ruta: `tutorials/[slug]/output.mp4`
- Ofrece ajustes si quiere cambiar algo

## Notas importantes

- **NUNCA uses CSS transitions o clases de animación de Tailwind** en los componentes React — Remotion renderiza frame a frame y esas animaciones no funcionan.
- **Todas las animaciones deben derivar de `useCurrentFrame()`** via `spring()` o `interpolate()`.
- El `config.json` es el source of truth. Si el usuario quiere ajustes, edita el JSON y re-renderiza.
- Los vídeos se guardan en `tutorials/[slug]/output.mp4` (gitignored). Los `config.json` sí se commitean.

````

- [ ] **Step 14.2: Verificar que el skill es accesible**

El skill debe ser visible cuando Claude Code está en el directorio `remotion-playground`.
Comprueba que el archivo existe en `skills/tutorial-generator/index.md`.

- [ ] **Step 14.3: Commit final**

```bash
git add skills/tutorial-generator/index.md tutorials/compact-command/config.json
git commit -m "feat: add tutorial-generator Claude Code skill"
````

---

## Task 15: Verificación end-to-end

- [ ] **Step 15.1: Reiniciar Claude Code en el directorio del proyecto**

```bash
cd /Users/enriquebook/Personal/Developer/remotion-playground
claude
```

- [ ] **Step 15.2: Invocar el skill**

```
/tutorial-generator "explica el comando /compact de Claude Code"
```

Expected:

1. Claude investiga con Context7 + WebSearch
2. Lanza subagente demo
3. Genera `tutorials/compact-command/config.json`
4. Ejecuta render script
5. Produce `tutorials/compact-command/output.mp4`

- [ ] **Step 15.3: Verificar vídeo**

```bash
open tutorials/compact-command/output.mp4
```

Expected: vídeo ~20-25s con intro animada, terminal simulada, callout, outro con bullets.

---

## Criterios de éxito

1. `/tutorial-generator "explica /compact"` produce un MP4 sin intervención manual
2. El vídeo tiene intro, terminal con typewriter, callout y outro
3. El tutorial se organiza en `tutorials/compact-command/` con `config.json` + `output.mp4`
4. Re-ejecutar `npx tsx scripts/render.ts tutorials/compact-command/config.json` produce el mismo vídeo
5. Los `config.json` son legibles y editables manualmente
