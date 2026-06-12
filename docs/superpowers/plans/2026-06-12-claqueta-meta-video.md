# «Hola, soy Claqueta» Meta Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Producir el tutorial landscape (~2:30) donde Claqueta se presenta en primera persona: tema visual nuevo `claqueta`, escenas `ClapperboardScene` y `CrewCreditsScene`, config con la escaleta aprobada, voiceover TTS, sound design y render a MP4.

**Architecture:** Se añade el tema al enum del schema y a `themes.ts`; las dos escenas nuevas siguen el patrón de las custom existentes (`Record<string, unknown>` props + `useThemeTokens()` + animación solo con `useCurrentFrame()`/`spring()`/`interpolate()`) y se registran en `customSceneRegistry.ts`. El config reutiliza `flow-diagram`, `terminal` e `icon-grid`. Los assets de audio se generan con los scripts existentes y el render con `scripts/render.ts`.

**Tech Stack:** Remotion 4 + React + TypeScript estricto, Zod, Gemini TTS (`scripts/generate-voiceover.ts`), Lyria + librería (`scripts/generate-sound-design.ts`), Prettier sin semicolons.

**Spec:** `docs/superpowers/specs/2026-06-12-claqueta-meta-video-design.md` — el VO es literal, no se reescribe.

**Worktree:** `/Users/enriquebook/Personal/Developer/Claqueta/.claude/worktrees/claqueta-meta-video` (rama `feature/claqueta-meta-video`). Setup previo necesario una sola vez:

```bash
ln -sf /Users/enriquebook/Personal/Developer/Claqueta/.env \
  /Users/enriquebook/Personal/Developer/Claqueta/.claude/worktrees/claqueta-meta-video/.env
```

**Verificación global:** `pnpm run lint` (ESLint + tsc) tras cada task de código.

---

### Task 1: Tema `claqueta`

**Files:**

- Modify: `src/compositions/ClaudeCodeTutorial/schema.ts:138`
- Modify: `src/shared/themes/themes.ts`

- [ ] **Step 1: Añadir el tema al enum del schema**

En `schema.ts`, cambiar:

```ts
theme: z.enum(["default", "linea-directa", "atom-dark", "h-alpha"]).default("default"),
```

por:

```ts
theme: z.enum(["default", "linea-directa", "atom-dark", "h-alpha", "claqueta"]).default("default"),
```

- [ ] **Step 2: Definir los tokens en `themes.ts`**

Añadir después de `hAlphaTheme` (antes del `const themes`):

```ts
const claquetaTheme: ThemeTokens = {
  background: "#0d0c0b",
  backgroundGradient: "radial-gradient(ellipse at 50% 35%, #1a1612 0%, #0d0c0b 70%)",
  foreground: "#f5efe0",
  foregroundMid: "#a89a82",
  foregroundLow: "#5f574a",
  primary: "#ffb347",
  primaryForeground: "#0d0c0b",
  secondary: "#e8dcc3",
  fontFamily: 'Georgia, "Times New Roman", ui-serif, serif',
  monoFontFamily: monoFont,
  terminal: {
    sceneBackground: "radial-gradient(ellipse at 50% 30%, #1a1612 0%, #0d0c0b 75%)",
    bg: "#14110e",
    titleBar: "#1f1a14",
    titleText: "#8a7c64",
    command: "#f5efe0",
    output: "#cfc4ac",
    claude: "#ffb347",
    shadow: "0 24px 70px rgba(0,0,0,0.75)",
    dots: ["#ff5f57", "#febc2e", "#28c840"],
    labelColor: "#a89a82",
    successColor: "#c9a44d",
    statusBarBg: "#110e0b",
    borderColor: "#332b20",
    separatorColor: "#332b20",
    costColor: "#5f574a",
    userMessageBg: "#1a1612",
    userMessageBorder: "#332b20",
  },
  card: {
    bg: "#171310",
    bgGradient: "linear-gradient(160deg, #1d1813 0%, #12100d 100%)",
    border: "#332b20",
    accentBorder: "#ffb347",
    shadow: "0 16px 50px rgba(0,0,0,0.6)",
  },
  mascot: {
    show: false,
    cornerScale: 0.5,
    cornerOpacity: 0.7,
    cornerBottom: 20,
    cornerRight: 24,
  },
  overlay: "rgba(13,12,11,0.82)",
  label: "Claqueta · se presenta",
  labelColor: "#ffb347",
  accentLine: "linear-gradient(90deg, #ffb347, #e8dcc3)",
}
```

y registrarlo en el record:

```ts
const themes: Record<ThemeName, ThemeTokens> = {
  default: defaultTheme,
  "linea-directa": lineaDirectaTheme,
  "atom-dark": atomDarkTheme,
  "h-alpha": hAlphaTheme,
  claqueta: claquetaTheme,
}
```

- [ ] **Step 3: Verificar**

Run: `pnpm run lint`
Expected: sin errores (tsc obliga a que el Record cubra el nuevo `ThemeName` — si falta, falla aquí).

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/schema.ts src/shared/themes/themes.ts
git commit -m "feat(themes): add claqueta cinema theme"
```

---

### Task 2: `ClapperboardScene`

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/ClapperboardScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Crear la escena**

Crear `ClapperboardScene.tsx` con exactamente este contenido:

```tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"

interface ClapperboardProps {
  mode?: "action" | "cut"
  title?: string
  subtitle?: string
  sceneLabel?: string
  configLines?: string[]
}

// Frame del golpe en modo "action": tras el countdown de cine (3-2-1 ≈ 54 frames)
const ACTION_CLAP_FRAME = 66
// En modo "cut" el golpe llega al 72% de la escena
const CUT_CLAP_RATIO = 0.72

const STRIPE = (deg: number, amber: string) =>
  `repeating-linear-gradient(${deg}deg, #14110e 0 26px, ${amber} 26px 52px)`

const Clapper: React.FC<{ clapFrame: number; tokens: ReturnType<typeof useThemeTokens>; label: string }> = ({
  clapFrame,
  tokens,
  label,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Entrada del conjunto (desliza desde abajo)
  const enter = spring({ frame: frame - (clapFrame - 26), fps, config: { damping: 14, stiffness: 120 } })
  // Brazo superior: abierto (-32º) hasta el golpe, cierre seco con spring rígido
  const close = spring({ frame: frame - clapFrame, fps, config: { damping: 22, stiffness: 420 }, durationInFrames: 10 })
  const armAngle = interpolate(close, [0, 1], [-32, 0])
  // Vibración breve del cuerpo tras el golpe
  const shake =
    frame >= clapFrame && frame < clapFrame + 8
      ? Math.sin((frame - clapFrame) * 2.4) * (8 - (frame - clapFrame)) * 0.8
      : 0

  return (
    <div
      style={{
        position: "relative",
        width: 520,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [220, 0]) + shake}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -54,
          left: 0,
          width: 520,
          height: 56,
          background: STRIPE(135, tokens.primary),
          borderRadius: "8px 8px 0 0",
          border: "3px solid #14110e",
          transformOrigin: "14px 100%",
          transform: `rotate(${armAngle}deg)`,
          boxShadow: tokens.card.shadow,
        }}
      />
      <div
        style={{
          width: 520,
          borderRadius: "0 0 12px 12px",
          background: "#14110e",
          border: "3px solid #14110e",
          boxShadow: tokens.card.shadow,
          overflow: "hidden",
        }}
      >
        <div style={{ height: 56, background: STRIPE(45, tokens.secondary) }} />
        <div style={{ padding: "26px 30px 30px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontFamily: tokens.monoFontFamily,
              fontSize: 15,
              letterSpacing: 4,
              color: tokens.foregroundMid,
            }}
          >
            PROD. CLAQUETA
          </div>
          <div style={{ fontFamily: tokens.fontFamily, fontSize: 40, fontWeight: 700, color: tokens.foreground }}>
            {label}
          </div>
          <div
            style={{ display: "flex", gap: 26, fontFamily: tokens.monoFontFamily, fontSize: 14, color: tokens.primary }}
          >
            <span>ESCENA 01</span>
            <span>TOMA ÚNICA</span>
            <span>30 FPS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const FilmLeader: React.FC<{ tokens: ReturnType<typeof useThemeTokens> }> = ({ tokens }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const perDigit = Math.round(fps * 0.6)
  const digit = 3 - Math.min(2, Math.floor(frame / perDigit))
  const sweep = ((frame % perDigit) / perDigit) * 360
  const visible = frame < perDigit * 3

  if (!visible) return null
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 380, height: 380 }}>
        <svg width="380" height="380" viewBox="0 0 380 380">
          <circle cx="190" cy="190" r="170" stroke={tokens.foregroundLow} strokeWidth="2" fill="none" />
          <circle cx="190" cy="190" r="120" stroke={tokens.foregroundLow} strokeWidth="2" fill="none" />
          <line x1="0" y1="190" x2="380" y2="190" stroke={tokens.foregroundLow} strokeWidth="1.5" />
          <line x1="190" y1="0" x2="190" y2="380" stroke={tokens.foregroundLow} strokeWidth="1.5" />
          <line
            x1="190"
            y1="190"
            x2={190 + 170 * Math.cos(((sweep - 90) * Math.PI) / 180)}
            y2={190 + 170 * Math.sin(((sweep - 90) * Math.PI) / 180)}
            stroke={tokens.primary}
            strokeWidth="3"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: tokens.fontFamily,
            fontSize: 170,
            fontWeight: 700,
            color: tokens.foreground,
          }}
        >
          {digit}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export const ClapperboardScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ClapperboardProps
  const { mode = "action", title = "CLAQUETA", subtitle, configLines = [] } = props
  const frame = useCurrentFrame()
  const { fps, durationInFrames, height } = useVideoConfig()
  const tokens = useThemeTokens()

  const clapFrame = mode === "action" ? ACTION_CLAP_FRAME : Math.round(durationInFrames * CUT_CLAP_RATIO)
  const titleIn = spring({ frame: frame - clapFrame - 6, fps, config: { damping: 16 } })
  // Modo cut: scroll lento del config.json de fondo + fundido final a negro
  const scrollY = interpolate(frame, [0, durationInFrames], [0, -configLines.length * 34])
  const fadeOut =
    mode === "cut"
      ? interpolate(frame, [durationInFrames - Math.round(fps * 0.8), durationInFrames], [0, 1], {
          extrapolateLeft: "clamp",
        })
      : 0

  return (
    <AbsoluteFill style={{ background: tokens.backgroundGradient, alignItems: "center", justifyContent: "center" }}>
      {/* letterbox */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: height * 0.07, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: height * 0.07, background: "#000" }} />

      {mode === "cut" && configLines.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "12%",
            left: "8%",
            right: "8%",
            bottom: "12%",
            overflow: "hidden",
            opacity: 0.28,
            maskImage: "linear-gradient(180deg, transparent 0%, black 18%, black 82%, transparent 100%)",
          }}
        >
          <div style={{ transform: `translateY(${scrollY}px)` }}>
            {configLines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: tokens.monoFontFamily,
                  fontSize: 22,
                  lineHeight: "34px",
                  color: tokens.primary,
                  whiteSpace: "pre",
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "action" && <FilmLeader tokens={tokens} />}
      {frame >= clapFrame - 30 && <Clapper clapFrame={clapFrame} tokens={tokens} label={title} />}

      {/* Flash de 3 frames en el golpe — a pantalla completa, fuera del contenedor transformado */}
      {frame >= clapFrame && frame < clapFrame + 3 && <AbsoluteFill style={{ background: "rgba(245,239,224,0.55)" }} />}

      {subtitle && (
        <div
          style={{
            position: "absolute",
            bottom: "11%",
            fontFamily: tokens.monoFontFamily,
            fontSize: 20,
            letterSpacing: 3,
            color: tokens.foregroundMid,
            opacity: titleIn,
          }}
        >
          {subtitle}
        </div>
      )}

      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Registrar en `customSceneRegistry.ts`**

Añadir el import (orden alfabético, tras `ChapterCardScene`):

```ts
import { ClapperboardScene } from "./scenes/custom/ClapperboardScene"
```

y la entrada en el record (tras `"chapter-card"`):

```ts
  clapperboard: ClapperboardScene,
```

- [ ] **Step 3: Verificar**

Run: `pnpm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/ClapperboardScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): clapperboard scene with film leader"
```

---

### Task 3: `CrewCreditsScene`

**Files:**

- Create: `src/compositions/ClaudeCodeTutorial/scenes/custom/CrewCreditsScene.tsx`
- Modify: `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`

- [ ] **Step 1: Crear la escena**

```tsx
import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"

interface CreditEntry {
  role: string
  name: string
}

interface CrewCreditsProps {
  title?: string
  credits?: CreditEntry[]
  producedBy?: string
  footer?: string
}

const normalizeCredits = (raw: unknown): CreditEntry[] => {
  if (!Array.isArray(raw)) return []
  const out: CreditEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const r = item as Record<string, unknown>
    if (typeof r.role === "string" && typeof r.name === "string") out.push({ role: r.role, name: r.name })
  }
  return out
}

const ROW_HEIGHT = 96
const HEADER_BLOCK = 220
const PRODUCED_BLOCK = 260

export const CrewCreditsScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as CrewCreditsProps
  const credits = normalizeCredits(props.credits)
  const { title = "REPARTO", producedBy, footer } = props
  const frame = useCurrentFrame()
  const { durationInFrames, fps, height } = useVideoConfig()
  const tokens = useThemeTokens()

  const contentHeight = HEADER_BLOCK + credits.length * ROW_HEIGHT + (producedBy ? PRODUCED_BLOCK : 0)
  // El scroll arranca tras una pausa de 1s y termina 1s antes del final
  const scrollStart = fps
  const scrollEnd = durationInFrames - fps
  const y = interpolate(frame, [scrollStart, scrollEnd], [height * 0.78, -contentHeight], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill style={{ background: tokens.backgroundGradient, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: height * 0.07,
          background: "#000",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: height * 0.07,
          background: "#000",
          zIndex: 2,
        }}
      />

      <div style={{ position: "absolute", left: 0, right: 0, transform: `translateY(${y}px)`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: tokens.monoFontFamily,
            fontSize: 22,
            letterSpacing: 10,
            color: tokens.primary,
            marginBottom: 18,
          }}
        >
          {title}
        </div>
        <div style={{ width: 120, height: 2, background: tokens.accentLine, margin: "0 auto 90px" }} />

        {credits.map((c, i) => (
          <div key={i} style={{ height: ROW_HEIGHT }}>
            <div
              style={{
                fontFamily: tokens.monoFontFamily,
                fontSize: 15,
                letterSpacing: 5,
                color: tokens.foregroundMid,
                textTransform: "uppercase",
              }}
            >
              {c.role}
            </div>
            <div style={{ fontFamily: tokens.fontFamily, fontSize: 38, fontWeight: 700, color: tokens.foreground }}>
              {c.name}
            </div>
          </div>
        ))}

        {producedBy && (
          <div style={{ marginTop: 110 }}>
            <div
              style={{ fontFamily: tokens.monoFontFamily, fontSize: 15, letterSpacing: 5, color: tokens.foregroundMid }}
            >
              PRODUCE
            </div>
            <div style={{ fontFamily: tokens.fontFamily, fontSize: 44, fontWeight: 700, color: tokens.primary }}>
              {producedBy}
            </div>
            {footer && (
              <div
                style={{ marginTop: 14, fontFamily: tokens.monoFontFamily, fontSize: 16, color: tokens.foregroundLow }}
              >
                {footer}
              </div>
            )}
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Registrar** — import `CrewCreditsScene` en `customSceneRegistry.ts` (orden alfabético, tras `CountdownScene`) y entrada:

```ts
  "crew-credits": CrewCreditsScene,
```

- [ ] **Step 3: Verificar**

Run: `pnpm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ClaudeCodeTutorial/scenes/custom/CrewCreditsScene.tsx src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts
git commit -m "feat(scenes): crew credits rolling scene"
```

---

### Task 4: `config.json` del vídeo

**Files:**

- Create: `content/tutorials/claqueta-se-presenta/config.json`

- [ ] **Step 1: Crear el config**

El VO es LITERAL de la spec. Crear con este contenido exacto:

```json
{
  "id": "claqueta-se-presenta",
  "title": "Hola, soy Claqueta",
  "description": "Claqueta, el pipeline de vídeo automatizado, se presenta a sí misma: qué es, cómo está montada, cómo se usa y qué puedes pedirle — en un vídeo generado por su propio pipeline.",
  "fps": 30,
  "width": 1280,
  "height": 720,
  "theme": "claqueta",
  "transition": null,
  "scenes": [
    {
      "type": "custom",
      "componentId": "clapperboard",
      "durationInSeconds": 12,
      "props": {
        "mode": "action",
        "title": "HOLA, SOY CLAQUETA",
        "subtitle": "un vídeo hecho por su protagonista"
      }
    },
    {
      "type": "custom",
      "componentId": "flow-diagram",
      "durationInSeconds": 23,
      "props": {
        "title": "Qué soy",
        "description": "De una frase tuya a un MP4 terminado",
        "layout": "horizontal",
        "showParticle": true,
        "nodes": [
          { "id": "chat", "title": "Tú escribes", "description": "una idea en el chat", "icon": "user" },
          { "id": "brain", "title": "Yo pienso", "description": "investigo, guiono, dirijo", "icon": "lightbulb" },
          { "id": "render", "title": "Yo ruedo", "description": "React, frame a frame", "icon": "code" },
          { "id": "mp4", "title": "Tu vídeo", "description": "MP4 con voz y música", "icon": "check" }
        ],
        "edges": [
          { "from": "chat", "to": "brain" },
          { "from": "brain", "to": "render" },
          { "from": "render", "to": "mp4" }
        ]
      }
    },
    {
      "type": "custom",
      "componentId": "crew-credits",
      "durationInSeconds": 30,
      "props": {
        "title": "REPARTO",
        "credits": [
          { "role": "Investigación", "name": "La Documentalista" },
          { "role": "Guion", "name": "La Guionista" },
          { "role": "Dirección", "name": "La Directora" },
          { "role": "Sonido", "name": "La Sonidista" },
          { "role": "Voz", "name": "La Locutora" },
          { "role": "Escenografía", "name": "La Escenógrafa" },
          { "role": "Control de calidad", "name": "Scene QA" },
          { "role": "Validación", "name": "La Validadora" },
          { "role": "Crítica final", "name": "La Revisora" }
        ],
        "producedBy": "Un orquestador con Gemini",
        "footer": "rodado en tres servicios Docker: chat · cerebro · sala de render"
      }
    },
    {
      "type": "terminal",
      "title": "Claqueta · chat",
      "durationInSeconds": 30,
      "lines": [
        { "kind": "command", "text": "Hazme un short sobre los eclipses de 2026 en España" },
        {
          "kind": "claude",
          "text": "Te propongo esta escaleta: 1) gancho con la fecha, 2) qué se verá y dónde, 3) cómo observarlo seguro, 4) cierre con CTA. ¿La apruebas?"
        },
        { "kind": "output", "text": "⏸ checkpoint · escaleta_checkpoint — esperando decisión humana" },
        { "kind": "command", "text": "Aprobada. Adelante." },
        { "kind": "claude", "text": "Generando config.json, voz y música… renderizando frame a frame." },
        { "kind": "output", "text": "✓ render completo · output.mp4 · 94s · 30fps" }
      ]
    },
    {
      "type": "custom",
      "componentId": "icon-grid",
      "durationInSeconds": 30,
      "props": {
        "title": "Qué puedes pedirme",
        "columns": 3,
        "items": [
          { "icon": "lightbulb", "title": "Un vídeo nuevo", "description": "tutorial o short, desde cero" },
          { "icon": "gear", "title": "Revisar uno existente", "description": "el cambio mínimo que lo arregla" },
          { "icon": "layers", "title": "Una variante", "description": "nuevo público, mismo material" },
          { "icon": "file", "title": "Regenerar audio", "description": "solo voz, música o SFX" },
          { "icon": "book", "title": "Auditar calidad", "description": "informe sin tocar nada" },
          { "icon": "shield", "title": "Mejorarme a mí misma", "description": "detecto fricción y abro un PR" }
        ]
      }
    },
    {
      "type": "custom",
      "componentId": "clapperboard",
      "durationInSeconds": 25,
      "props": {
        "mode": "cut",
        "title": "CORTEN",
        "subtitle": "claqueta · pídeme un vídeo",
        "configLines": [
          "{",
          "  \"id\": \"claqueta-se-presenta\",",
          "  \"title\": \"Hola, soy Claqueta\",",
          "  \"theme\": \"claqueta\",",
          "  \"scenes\": [",
          "    { \"componentId\": \"clapperboard\", \"mode\": \"action\" },",
          "    { \"componentId\": \"flow-diagram\" },",
          "    { \"componentId\": \"crew-credits\" },",
          "    { \"type\": \"terminal\" },",
          "    { \"componentId\": \"icon-grid\" },",
          "    { \"componentId\": \"clapperboard\", \"mode\": \"cut\" }",
          "  ],",
          "  \"voiceover\": { \"provider\": \"gemini\" },",
          "  \"soundDesign\": { \"enabled\": true },",
          "  \"humanApproved\": true",
          "}"
        ]
      }
    }
  ],
  "voiceover": {
    "enabled": true,
    "provider": "gemini",
    "voiceId": "Kore",
    "language": "es-ES",
    "scenes": {
      "0": {
        "text": "¡Acción! Hola — soy Claqueta. Y antes de que preguntes: sí, este vídeo lo estoy haciendo yo misma. Deja que me explique.",
        "leadInMs": 2400,
        "audioStartMs": 300,
        "tailHoldMs": 600
      },
      "1": {
        "text": "Soy un pipeline de vídeo automatizado. Tú me escribes en un chat lo que quieres contar; yo lo investigo, escribo el guion, dirijo las escenas, pongo la voz y la música, y lo renderizo fotograma a fotograma con React. De una frase tuya a un MP4 terminado.",
        "leadInMs": 300,
        "audioStartMs": 200,
        "tailHoldMs": 600
      },
      "2": {
        "text": "Por dentro soy un equipo de rodaje completo: una investigadora que documenta el tema, una guionista que escribe la escaleta, una directora que decide cada plano, una sonidista, una locutora… y un orquestador que los coordina a todos. Tres servicios en Docker: el chat, el cerebro, y la sala de renderizado.",
        "leadInMs": 400,
        "audioStartMs": 250,
        "tailHoldMs": 700
      },
      "3": {
        "text": "Usarme es una conversación. Me pides un vídeo; yo te propongo la escaleta y espero. Porque mi regla de oro es: yo automatizo la ejecución, nunca el criterio. Tú apruebas el guion, tú apruebas el sonido. Cuando dices que sí, el resto es mío.",
        "leadInMs": 300,
        "audioStartMs": 200,
        "tailHoldMs": 600
      },
      "4": {
        "text": "Puedes pedirme un tutorial desde cero, retocar un vídeo que ya existe, sacar una variante, regenerar solo la voz… Y desde esta semana, algo más: cuando algo me hace tropezar, lo apunto. Y si me lo pides, me arreglo yo misma — y te abro un pull request para que tú decidas si el cambio entra.",
        "leadInMs": 300,
        "audioStartMs": 200,
        "tailHoldMs": 600
      },
      "5": {
        "text": "¿Y este vídeo? Su guion, sus escenas, esta voz que escuchas: todo salió de mi pipeline. Un humano solo aprobó la escaleta — como debe ser. Soy Claqueta. ¿Qué quieres rodar? …Corten.",
        "leadInMs": 400,
        "audioStartMs": 250,
        "tailHoldMs": 1200
      }
    }
  },
  "soundDesign": {
    "enabled": true,
    "musicBed": {
      "libraryId": "lofi-tech-2-loop",
      "volume": -19,
      "duckingVolume": -27,
      "fadeInMs": 1500,
      "fadeOutMs": 3000,
      "duckingFadeMs": 400
    },
    "sfx": [
      {
        "id": "clapperboard-clap",
        "prompt": "single sharp wooden film clapperboard clap, dry close-mic transient, short room tail, no music, no voice",
        "durationMs": 1200,
        "trigger": "scene-start",
        "sceneTypes": ["custom"],
        "loop": false,
        "volume": -8
      },
      {
        "id": "keyboard",
        "prompt": "soft mechanical keyboard typing in quiet room, cherry mx switches, gentle ASMR clicks, no background noise",
        "durationMs": 8000,
        "trigger": "typewriter",
        "sceneTypes": ["terminal"],
        "loop": true,
        "volume": -14
      }
    ]
  },
  "subtitles": {
    "enabled": true,
    "style": "karaoke",
    "fontSize": 32,
    "position": "bottom"
  }
}
```

Nota sobre el SFX del golpe: `trigger: "scene-start"` + `sceneTypes: ["custom"]` lo dispara en TODAS las escenas custom. Tras crear el config, LEER `scripts/generate-sound-design.ts` para comprobar si soporta un targeting más fino (p. ej. índices de escena). Si lo soporta, restringirlo a las escenas 0 y 5; si no, dejarlo y anotar la limitación en el reporte (el golpe sonará también al entrar en flow-diagram/credits/icon-grid: evaluar si es aceptable como "marca de escena" o bajar su volumen a -14).

- [ ] **Step 2: Validar**

Run: `pnpm exec tsx scripts/validate-config.ts content/tutorials/claqueta-se-presenta/config.json`
Expected: validación OK contra el schema Zod.

- [ ] **Step 3: Commit**

```bash
git add content/tutorials/claqueta-se-presenta/config.json
git commit -m "feat(content): claqueta meta video config"
```

---

### Task 5: Voiceover TTS

**Files:**

- Modify: `content/tutorials/claqueta-se-presenta/config.json` (duraciones)
- Genera (gitignored): `public/voiceover/claqueta-se-presenta/*.mp3`

- [ ] **Step 1: Setup de credenciales** (si no está hecho)

```bash
ln -sf /Users/enriquebook/Personal/Developer/Claqueta/.env .env
```

- [ ] **Step 2: Generar**

Run: `pnpm exec tsx scripts/generate-voiceover.ts content/tutorials/claqueta-se-presenta/config.json`
Expected: 6 MP3 en `public/voiceover/claqueta-se-presenta/`. Si el script falla por credenciales, reportar BLOCKED con el error exacto.

- [ ] **Step 3: Medir y ajustar duraciones**

```bash
for f in public/voiceover/claqueta-se-presenta/*.mp3; do
  echo "$f: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")s"
done
```

Para cada escena i: `durationInSeconds >= ceil(leadInMs/1000 + duración_mp3 + tailHoldMs/1000)`. Ajustar `durationInSeconds` en el config para que el VO quepa con ~1s de aire (en E1 mantener ≥12s para que el countdown+golpe respiren; en E6 mantener ≥4s de cola tras el «Corten» para el cierre y el fundido).

- [ ] **Step 4: Re-validar y commit**

```bash
pnpm exec tsx scripts/validate-config.ts content/tutorials/claqueta-se-presenta/config.json
git add content/tutorials/claqueta-se-presenta/config.json
git commit -m "feat(content): fit scene durations to voiceover"
```

---

### Task 6: Sound design

**Files:**

- Genera (gitignored): `public/audio/claqueta-se-presenta/*`

- [ ] **Step 1: Generar**

Run: `pnpm exec tsx scripts/generate-sound-design.ts content/tutorials/claqueta-se-presenta/config.json`
Expected: música copiada/generada + SFX en `public/audio/claqueta-se-presenta/`. Si Lyria no está disponible, el script tiene fallback a librería; reportar qué pasó con el SFX del clap.

- [ ] **Step 2: Verificar archivos**

```bash
eza public/audio/claqueta-se-presenta/
```

Expected: al menos el music bed y los SFX declarados.

(No hay commit: todo gitignored.)

---

### Task 7: Render y QA visual

- [ ] **Step 1: Render**

Run: `pnpm exec tsx scripts/render.ts content/tutorials/claqueta-se-presenta/config.json`
Expected: `content/tutorials/claqueta-se-presenta/output.mp4` sin errores. Si falta Chromium: `pnpm exec remotion browser ensure` y reintentar.

- [ ] **Step 2: Stills de QA**

Run: `pnpm exec tsx scripts/render-scene-stills.ts content/tutorials/claqueta-se-presenta/config.json` (leer el script primero si la firma difiere; alternativa: extraer frames con ffmpeg en los puntos 0:06, 0:20, 0:50, 1:20, 1:50, 2:20):

```bash
mkdir -p .generated/qa-claqueta && for t in 6 20 50 80 110 140; do
  ffmpeg -y -ss $t -i content/tutorials/claqueta-se-presenta/output.mp4 -frames:v 1 .generated/qa-claqueta/frame-$t.png 2>/dev/null
done
```

Revisar (con la herramienta Read sobre los PNG): claqueta visible y cerrada tras el golpe, créditos legibles y completos en su duración, terminal con checkpoint visible, icon-grid con 6 tarjetas, modo cut con config scrolleando y fundido final.

- [ ] **Step 3: Reportar duración total y cualquier desajuste VO/visual.**

---

### Task 8: Trazabilidad y PR

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: CHANGELOG** — bajo `[Unreleased]` → `### Added`:

```markdown
- **Vídeo meta «Hola, soy Claqueta»** (`content/tutorials/claqueta-se-presenta/`) — tutorial landscape ~2:30 donde Claqueta se presenta en primera persona y revela que el vídeo salió de su propio pipeline. Tema nuevo `claqueta` (sala de cine: negro proyector + ámbar tungsteno, letterbox), escenas custom `clapperboard` (film leader + golpe sincronizado) y `crew-credits` (créditos rodantes del reparto de subagentes), VO Gemini TTS (voz Kore), música de librería y SFX de claqueta
```

- [ ] **Step 2: Verificación final completa**

```bash
pnpm run lint
pnpm exec tsx scripts/validate-config.ts content/tutorials/claqueta-se-presenta/config.json
```

- [ ] **Step 3: Commit y push**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog for claqueta meta video"
git push -u origin feature/claqueta-meta-video
```

(El PR lo abre el controlador con el humano.)

---

## Notas para el ejecutor

- Estilo: Prettier 2 espacios, SIN semicolons, printWidth 120. ESLint `@remotion/eslint-config-flat` prohíbe animaciones CSS — todo movimiento via `useCurrentFrame()`.
- Las escenas custom reciben props como `Record<string, unknown>` y castean (patrón `CountdownScene.tsx`).
- `useThemeTokens()` para TODOS los colores; jamás hardcodear salvo el negro puro `#000` del letterbox/fundido y el `#14110e` estructural de la claqueta (es "madera", no tema).
- El VO de la spec es el guion aprobado: copiar literal, no parafrasear.
- Pre-commit: lint-staged (ESLint+Prettier) + commitlint `type(scope): descripción` ≤50 chars.

```

```
