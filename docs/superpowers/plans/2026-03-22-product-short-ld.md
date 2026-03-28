# ProductShort + /short-ld Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `ProductShort` vertical-video composition (1080×1920, 9:16) for Línea Directa marketing shorts, with 4 scene types (hero, benefits, pricing, cta) and a `/short-ld` skill to automate generation.

**Architecture:** New composition parallel to `ClaudeCodeTutorial`, sharing `ThemeContext` and `PixelPhoneMascot` via cross-import. Single `render.ts` extended with `config.composition` field to select which composition to render. Skill `/short-ld` follows the same pattern as `/tutorial-generator`.

**Tech Stack:** Remotion v4, Zod, React, TypeScript, `spring()` + `interpolate()` for all animations.

**Spec:** `docs/superpowers/specs/2026-03-22-product-short-ld-design.md`

---

## File Structure

### New files

| File                                                     | Responsibility                                             |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| `src/compositions/ProductShort/schema.ts`                | Zod schemas for ProductShortConfig + 4 scene types         |
| `src/compositions/ProductShort/calculateMetadata.ts`     | Sum scene durations → total frames (1080×1920)             |
| `src/compositions/ProductShort/ProductShort.tsx`         | Main composition: ThemeContext provider + Series of scenes |
| `src/compositions/ProductShort/scenes/HeroScene.tsx`     | Red bg, title, subtitle, PixelPhoneMascot bounce           |
| `src/compositions/ProductShort/scenes/BenefitsScene.tsx` | White bg, staggered benefit items with icons               |
| `src/compositions/ProductShort/scenes/PricingScene.tsx`  | Price + period + note, light/dark variant                  |
| `src/compositions/ProductShort/scenes/CtaScene.tsx`      | CTA text, URL, mascot, "tirí" pulse waves                  |
| `skills/short-ld/SKILL.md`                               | Skill definition for `/short-ld`                           |
| `.claude/skills/short-ld`                                | Symlink → `../../skills/short-ld/`                         |

### Modified files

| File                | Change                                                                          |
| ------------------- | ------------------------------------------------------------------------------- |
| `src/Root.tsx`      | Register `ProductShort` composition                                             |
| `scripts/render.ts` | Read `config.composition` to select composition (default: `ClaudeCodeTutorial`) |
| `.gitignore`        | Add `shorts/*/output.mp4`                                                       |

---

## Task 1: Schema — `ProductShortConfigSchema`

**Files:**

- Create: `src/compositions/ProductShort/schema.ts`

- [ ] **Step 1: Create the schema file**

```typescript
// src/compositions/ProductShort/schema.ts
import { z } from "zod"

const HeroSceneSchema = z.object({
  type: z.literal("hero"),
  title: z.string(),
  subtitle: z.string().optional(),
  durationInSeconds: z.number().min(1).max(10),
})

const BenefitItemSchema = z.object({
  icon: z.string(),
  text: z.string(),
})

const BenefitsSceneSchema = z.object({
  type: z.literal("benefits"),
  title: z.string().optional(),
  items: z.array(BenefitItemSchema).min(1),
  durationInSeconds: z.number().min(2).max(15),
})

const PricingSceneSchema = z.object({
  type: z.literal("pricing"),
  price: z.string(),
  period: z.string().optional(),
  note: z.string().optional(),
  variant: z.enum(["light", "dark"]),
  durationInSeconds: z.number().min(1).max(10),
})

const CtaSceneSchema = z.object({
  type: z.literal("cta"),
  text: z.string(),
  url: z.string().optional(),
  durationInSeconds: z.number().min(1).max(10),
})

const ProductShortSceneSchema = z.union([HeroSceneSchema, BenefitsSceneSchema, PricingSceneSchema, CtaSceneSchema])

export const ProductShortConfigSchema = z.object({
  id: z.string(),
  composition: z.literal("ProductShort"),
  product: z.string(),
  headline: z.string(),
  theme: z.literal("linea-directa"),
  fps: z.literal(30),
  width: z.literal(1080),
  height: z.literal(1920),
  scenes: z.array(ProductShortSceneSchema).min(1),
})

export type ProductShortConfig = z.infer<typeof ProductShortConfigSchema>
export type ProductShortScene = z.infer<typeof ProductShortSceneSchema>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/compositions/ProductShort/schema.ts 2>&1 | head -20`
Expected: No errors (or only errors about missing imports from other files not yet created)

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ProductShort/schema.ts
git commit -m "feat(product-short): add Zod schema for ProductShort composition"
```

---

## Task 2: `calculateMetadata` + main composition shell

**Files:**

- Create: `src/compositions/ProductShort/calculateMetadata.ts`
- Create: `src/compositions/ProductShort/ProductShort.tsx`

- [ ] **Step 1: Create calculateMetadata**

```typescript
// src/compositions/ProductShort/calculateMetadata.ts
import { CalculateMetadataFunction } from "remotion"
import { ProductShortConfig } from "./schema"

export const calculateMetadata: CalculateMetadataFunction<ProductShortConfig> = async ({ props }) => {
  const totalSeconds = props.scenes.reduce((sum, scene) => sum + scene.durationInSeconds, 0)

  return {
    durationInFrames: Math.ceil(totalSeconds * props.fps),
    fps: props.fps,
    width: props.width,
    height: props.height,
  }
}
```

- [ ] **Step 2: Create ProductShort.tsx with placeholder scene rendering**

```typescript
// src/compositions/ProductShort/ProductShort.tsx
import React from "react"
import { AbsoluteFill, Series } from "remotion"
import { ThemeContext } from "../ClaudeCodeTutorial/ThemeContext"
import { ProductShortConfig } from "./schema"

export const ProductShort: React.FC<ProductShortConfig> = (config) => {
  return (
    <ThemeContext.Provider value="linea-directa">
      <AbsoluteFill style={{ background: "#FFFFFF" }}>
        <Series>
          {config.scenes.map((scene, i) => {
            const durationInFrames = Math.ceil(scene.durationInSeconds * config.fps)
            return (
              <Series.Sequence key={i} durationInFrames={durationInFrames}>
                {/* Scene components will be added in subsequent tasks */}
                <AbsoluteFill
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 48,
                    color: "#1A1A1A",
                  }}
                >
                  {scene.type}
                </AbsoluteFill>
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ProductShort/calculateMetadata.ts src/compositions/ProductShort/ProductShort.tsx
git commit -m "feat(product-short): add calculateMetadata and composition shell"
```

---

## Task 3: Register composition in Root.tsx

**Files:**

- Modify: `src/Root.tsx`

- [ ] **Step 1: Add ProductShort to Root.tsx**

Add imports at the top:

```typescript
import { ProductShort } from "./compositions/ProductShort/ProductShort"
import { calculateMetadata as calculateProductShortMetadata } from "./compositions/ProductShort/calculateMetadata"
import { ProductShortConfigSchema } from "./compositions/ProductShort/schema"
```

Add inside `<>...</>` after the ClaudeCodeTutorial Composition:

```typescript
<Composition
  id="ProductShort"
  component={ProductShort}
  durationInFrames={450}
  fps={30}
  width={1080}
  height={1920}
  schema={ProductShortConfigSchema}
  defaultProps={{
    id: "default",
    composition: "ProductShort" as const,
    product: "Seguro de Coche",
    headline: "Todo riesgo desde 168€/año",
    theme: "linea-directa" as const,
    fps: 30 as const,
    width: 1080 as const,
    height: 1920 as const,
    scenes: [
      { type: "hero" as const, title: "Seguro de Coche", durationInSeconds: 4 },
    ],
  }}
  calculateMetadata={calculateProductShortMetadata}
/>
```

- [ ] **Step 2: Verify Remotion Studio loads**

Run: `npx remotion studio --port 3123 &` then check it starts without errors.
Expected: Studio starts, both compositions visible in sidebar.
Cleanup: `kill %1` to stop the background Studio process.

- [ ] **Step 3: Commit**

```bash
git add src/Root.tsx
git commit -m "feat(product-short): register ProductShort composition in Root"
```

---

## Task 4: HeroScene component

**Files:**

- Create: `src/compositions/ProductShort/scenes/HeroScene.tsx`

- [ ] **Step 1: Create HeroScene**

```typescript
// src/compositions/ProductShort/scenes/HeroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { ProductShortConfigSchema } from "../schema"
import { PixelPhoneMascot } from "../../ClaudeCodeTutorial/components/PixelPhoneMascot"

type HeroSceneProps = Extract<
  z.infer<typeof ProductShortConfigSchema>["scenes"][number],
  { type: "hero" }
>

export const HeroScene: React.FC<HeroSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })
  const titleY = interpolate(titleSpring, [0, 1], [60, 0])

  const subtitleSpring = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  })

  const mascotSpring = spring({
    frame: Math.max(0, frame - 4),
    fps,
    config: { damping: 12, mass: 0.8 },
    durationInFrames: 30,
  })
  const mascotY = interpolate(mascotSpring, [0, 1], [200, 0])

  return (
    <AbsoluteFill
      style={{
        background: "#CC3333",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: "80px 60px",
      }}
    >
      <div
        style={{
          opacity: mascotSpring,
          transform: `translateY(${mascotY}px)`,
        }}
      >
        <PixelPhoneMascot scale={2} animate={true} />
      </div>

      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 72,
          fontWeight: 800,
          color: "#FFFFFF",
          textAlign: "center",
          lineHeight: 1.1,
          opacity: titleSpring,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 36,
            fontWeight: 400,
            color: "rgba(255,255,255,0.9)",
            textAlign: "center",
            opacity: subtitleSpring,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Wire into ProductShort.tsx**

Add import: `import { HeroScene } from "./scenes/HeroScene"`

Replace the placeholder for hero type:

```typescript
{scene.type === "hero" && <HeroScene {...scene} />}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors. PixelPhoneMascot props `scale` and `animate` are confirmed in the component interface.

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ProductShort/scenes/HeroScene.tsx src/compositions/ProductShort/ProductShort.tsx
git commit -m "feat(product-short): add HeroScene with bounce animation"
```

---

## Task 5: BenefitsScene component

**Files:**

- Create: `src/compositions/ProductShort/scenes/BenefitsScene.tsx`

- [ ] **Step 1: Create BenefitsScene**

```typescript
// src/compositions/ProductShort/scenes/BenefitsScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { ProductShortConfigSchema } from "../schema"

type BenefitsSceneProps = Extract<
  z.infer<typeof ProductShortConfigSchema>["scenes"][number],
  { type: "benefits" }
>

const STAGGER_FRAMES = 12

export const BenefitsScene: React.FC<BenefitsSceneProps> = ({ title, items }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        padding: "120px 60px",
        gap: 40,
      }}
    >
      {/* Red accent bar on the left */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 8,
          height: "100%",
          background: "#CC3333",
        }}
      />

      {title && (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 48,
            fontWeight: 700,
            color: "#1A1A1A",
            opacity: titleSpring,
            paddingLeft: 24,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 36, paddingLeft: 24 }}>
        {items.map((item, idx) => {
          const itemSpring = spring({
            frame: Math.max(0, frame - (idx + 1) * STAGGER_FRAMES),
            fps,
            config: { damping: 200 },
            durationInFrames: 20,
          })
          const itemX = interpolate(itemSpring, [0, 1], [40, 0])

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                opacity: itemSpring,
                transform: `translateX(${itemX}px)`,
              }}
            >
              <div style={{ fontSize: 48, flexShrink: 0 }}>{item.icon}</div>
              <div
                style={{
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 36,
                  fontWeight: 500,
                  color: "#1A1A1A",
                  lineHeight: 1.3,
                }}
              >
                {item.text}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Wire into ProductShort.tsx**

Add import: `import { BenefitsScene } from "./scenes/BenefitsScene"`

Add scene type rendering:

```typescript
{scene.type === "benefits" && <BenefitsScene {...scene} />}
```

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ProductShort/scenes/BenefitsScene.tsx src/compositions/ProductShort/ProductShort.tsx
git commit -m "feat(product-short): add BenefitsScene with staggered items"
```

---

## Task 6: PricingScene component

**Files:**

- Create: `src/compositions/ProductShort/scenes/PricingScene.tsx`

- [ ] **Step 1: Create PricingScene**

```typescript
// src/compositions/ProductShort/scenes/PricingScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { ProductShortConfigSchema } from "../schema"

type PricingSceneProps = Extract<
  z.infer<typeof ProductShortConfigSchema>["scenes"][number],
  { type: "pricing" }
>

export const PricingScene: React.FC<PricingSceneProps> = ({
  price,
  period,
  note,
  variant,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const isDark = variant === "dark"
  const bg = isDark ? "#CC3333" : "#FFFFFF"
  const priceColor = isDark ? "#FFFFFF" : "#CC3333"
  const textColor = isDark ? "rgba(255,255,255,0.85)" : "#888888"

  const priceSpring = spring({
    frame,
    fps,
    config: { damping: 10, mass: 0.6 },
    durationInFrames: 25,
  })
  const priceScale = interpolate(priceSpring, [0, 1], [0.3, 1])

  const detailSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  })

  return (
    <AbsoluteFill
      style={{
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {!isDark && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            height: 400,
            borderRadius: "50%",
            border: "4px solid #CC3333",
            opacity: 0.15,
          }}
        />
      )}

      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 120,
          fontWeight: 900,
          color: priceColor,
          transform: `scale(${priceScale})`,
        }}
      >
        {price}
      </div>

      {period && (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 36,
            color: textColor,
            opacity: detailSpring,
          }}
        >
          {period}
        </div>
      )}

      {note && (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 28,
            color: textColor,
            opacity: detailSpring,
            marginTop: 8,
          }}
        >
          {note}
        </div>
      )}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Wire into ProductShort.tsx**

Add import: `import { PricingScene } from "./scenes/PricingScene"`

Add scene type rendering:

```typescript
{scene.type === "pricing" && <PricingScene {...scene} />}
```

- [ ] **Step 3: Commit**

```bash
git add src/compositions/ProductShort/scenes/PricingScene.tsx src/compositions/ProductShort/ProductShort.tsx
git commit -m "feat(product-short): add PricingScene with scale animation"
```

---

## Task 7: CtaScene component

**Files:**

- Create: `src/compositions/ProductShort/scenes/CtaScene.tsx`

- [ ] **Step 1: Create CtaScene**

```typescript
// src/compositions/ProductShort/scenes/CtaScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { ProductShortConfigSchema } from "../schema"
import { PixelPhoneMascot } from "../../ClaudeCodeTutorial/components/PixelPhoneMascot"

type CtaSceneProps = Extract<
  z.infer<typeof ProductShortConfigSchema>["scenes"][number],
  { type: "cta" }
>

const PULSE_COUNT = 3

export const CtaScene: React.FC<CtaSceneProps> = ({ text, url }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const ctaSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })
  const ctaY = interpolate(ctaSpring, [0, 1], [30, 0])

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: "80px 60px",
      }}
    >
      {/* "Tirí tirí tirí" pulse waves */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        {Array.from({ length: PULSE_COUNT }).map((_, i) => {
          const pulseDelay = i * 8
          const pulseSpring = spring({
            frame: Math.max(0, frame - pulseDelay),
            fps,
            config: { damping: 30, mass: 1.5 },
            durationInFrames: 40,
          })
          const pulseScale = interpolate(pulseSpring, [0, 1], [0.2, 1])
          const pulseOpacity = interpolate(pulseSpring, [0, 0.5, 1], [0, 0.3, 0])

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${pulseScale})`,
                width: 600,
                height: 600,
                borderRadius: "50%",
                border: "3px solid #CC3333",
                opacity: pulseOpacity,
              }}
            />
          )
        })}
      </div>

      <div style={{ transform: "scale(0.8)" }}>
        <PixelPhoneMascot scale={1.5} animate={false} />
      </div>

      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 52,
          fontWeight: 700,
          color: "#CC3333",
          textAlign: "center",
          opacity: ctaSpring,
          transform: `translateY(${ctaY}px)`,
        }}
      >
        {text}
      </div>

      {url && (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 28,
            color: "#888888",
            opacity: ctaSpring,
          }}
        >
          {url}
        </div>
      )}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Wire into ProductShort.tsx**

Add import: `import { CtaScene } from "./scenes/CtaScene"`

Add scene type rendering:

```typescript
{scene.type === "cta" && <CtaScene {...scene} />}
```

- [ ] **Step 3: Verify TypeScript compiles with all scenes wired**

Run: `npx tsc --noEmit`
Expected: No errors. All 4 scene imports and type-narrowed renders should compile cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/compositions/ProductShort/scenes/CtaScene.tsx src/compositions/ProductShort/ProductShort.tsx
git commit -m "feat(product-short): add CtaScene with pulse waves and finalize composition"
```

---

## Task 8: Extend render.ts for multi-composition support

**Files:**

- Modify: `scripts/render.ts`

- [ ] **Step 1: Update render.ts to read `config.composition`**

In `scripts/render.ts`, replace lines 27-32 (the hardcoded composition selection) with:

```typescript
// Before (lines 27-32):
console.log("🔍 Selecting composition ClaudeCodeTutorial...")
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: "ClaudeCodeTutorial",
  inputProps: config,
})

// After:
const compositionId = config.composition || "ClaudeCodeTutorial"
console.log(`🔍 Selecting composition ${compositionId}...`)
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: compositionId,
  inputProps: config,
})
```

- [ ] **Step 2: Test with existing tutorial**

Run: `npx tsx scripts/render.ts tutorials/plan-command/config.json`
Expected: Renders successfully (defaults to `ClaudeCodeTutorial` since no `composition` field)

- [ ] **Step 3: Commit**

```bash
git add scripts/render.ts
git commit -m "feat(render): support config.composition field for multi-composition rendering"
```

---

## Task 9: Update .gitignore

**Files:**

- Modify: `.gitignore`

- [ ] **Step 1: Add shorts output to .gitignore**

Add after the `tutorials/*/output.mp4` line:

```
shorts/*/output.mp4
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore shorts output videos"
```

---

## Task 10: Smoke test — render a sample ProductShort

**Files:**

- Create: `shorts/seguro-coche-demo/config.json`

- [ ] **Step 1: Create a sample config**

```json
{
  "id": "seguro-coche-demo",
  "composition": "ProductShort",
  "product": "Seguro de Coche",
  "headline": "Todo riesgo desde 168€/año",
  "theme": "linea-directa",
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "scenes": [
    {
      "type": "hero",
      "title": "Seguro de Coche",
      "subtitle": "Todo riesgo desde 168€/año",
      "durationInSeconds": 4
    },
    {
      "type": "benefits",
      "title": "¿Qué incluye?",
      "items": [
        { "icon": "🛡️", "text": "Asistencia en carretera 24h" },
        { "icon": "🔧", "text": "Reparación en talleres oficiales" },
        { "icon": "🚗", "text": "Coche de sustitución" },
        { "icon": "📱", "text": "Gestión 100% online" }
      ],
      "durationInSeconds": 6
    },
    {
      "type": "pricing",
      "price": "168€",
      "period": "al año",
      "note": "sin permanencia",
      "variant": "dark",
      "durationInSeconds": 4
    },
    {
      "type": "cta",
      "text": "Calcula tu precio",
      "url": "lineadirecta.com",
      "durationInSeconds": 4
    }
  ]
}
```

- [ ] **Step 2: Render the sample**

Run: `npx tsx scripts/render.ts shorts/seguro-coche-demo/config.json`
Expected: Renders `shorts/seguro-coche-demo/output.mp4` (18s, 1080×1920)

- [ ] **Step 3: Verify existing tutorials still render**

Run: `npx tsx scripts/render.ts tutorials/git-worktrees-claude-code/config.json`
Expected: Renders successfully (backwards compatible)

- [ ] **Step 4: Commit sample config**

```bash
git add shorts/seguro-coche-demo/config.json
git commit -m "test: add smoke test config for ProductShort composition"
```

---

## Task 11: `/short-ld` skill

**Files:**

- Create: `skills/short-ld/SKILL.md`
- Create: `.claude/skills/short-ld` (symlink)

- [ ] **Step 1: Create SKILL.md**

````markdown
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
````

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

````

- [ ] **Step 2: Create symlink**

```bash
ln -s ../../skills/short-ld .claude/skills/short-ld
````

- [ ] **Step 3: Verify skill is discoverable**

Check that `.claude/skills/short-ld/SKILL.md` resolves correctly using the `Read` tool on `.claude/skills/short-ld/SKILL.md`.
Expected: Shows the frontmatter of the skill file (name, description).

- [ ] **Step 4: Commit**

```bash
git add skills/short-ld/SKILL.md .claude/skills/short-ld
git commit -m "feat: add /short-ld skill for Línea Directa marketing shorts"
```

---

## Verification Checklist

After all tasks are complete:

1. `npx tsx scripts/render.ts shorts/seguro-coche-demo/config.json` — renders ProductShort successfully
2. `npx tsx scripts/render.ts tutorials/plan-command/config.json` — existing tutorials still work
3. Use the `Grep` tool: search for `"ProductShort"` in `src/` — found in Root.tsx, ProductShort.tsx, schema.ts, calculateMetadata.ts
4. `.claude/skills/short-ld/SKILL.md` — symlink resolves correctly
5. No TypeScript errors: `npx tsc --noEmit`
