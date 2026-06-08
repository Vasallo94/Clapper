# H-alpha Solar Video — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a vertical (1080×1920) ~78s Spanish LinkedIn short that presents the H-alpha solar-physics website, mimicking its "paper atlas" visual style, via the existing manual Remotion render flow (`scripts/render.ts`).

**Architecture:** Reuse the existing dimension-agnostic scene engine (`CompositionShell` + `customSceneRegistry`) by (1) adding a new `h-alpha` theme that clones the website palette, (2) relaxing the `TutorialConfigSchema` to accept vertical dimensions and the new theme, (3) registering a new `VerticalShort` composition in `Root.tsx` pointing at the same `ClaudeCodeTutorial` engine component, and (4) authoring a `config.json` with 6 scenes. Voiceover (ElevenLabs, sober male) and sound design (minimal ambient) are added last, then rendered.

**Tech Stack:** Remotion, React, Zod, TypeScript, `@remotion/bundler`, ElevenLabs TTS, `tsx`.

**Decision log:** Manual flow chosen over the DeepAgent pipeline (`packages/agent`) because this video needs a brand-new theme and a new vertical "educational explainer" composition — infrastructure the pipeline's `scene_creator` does not produce (it only builds individual scene components), and because the pipeline is wired to Línea Directa marketing. Once this infra exists in `src/`, it is available to the pipeline for future use.

---

## File Structure

| File                                            | Responsibility                                                               | Action        |
| ----------------------------------------------- | ---------------------------------------------------------------------------- | ------------- |
| `src/shared/themes/themes.ts`                   | Add `hAlphaTheme` tokens + register `"h-alpha"`                              | Modify        |
| `src/compositions/ClaudeCodeTutorial/schema.ts` | Allow `"h-alpha"` theme, vertical width/height, optional `composition` field | Modify        |
| `src/Root.tsx`                                  | Register `VerticalShort` composition reusing the engine component            | Modify        |
| `public/images/halpha/sun-h-alpha.png`          | Hero solar photo asset                                                       | Create (copy) |
| `content/shorts/halpha-solar/config.json`       | The video definition (6 scenes)                                              | Create        |
| `content/shorts/halpha-solar/output.mp4`        | Rendered video (gitignored)                                                  | Generated     |

---

## Task 1: Add the `h-alpha` theme

**Files:**

- Modify: `src/shared/themes/themes.ts`

- [ ] **Step 1: Add the `hAlphaTheme` constant**

Insert after the `atomDarkTheme` definition (before `const themes: Record<ThemeName, ThemeTokens>`):

```ts
const hAlphaTheme: ThemeTokens = {
  background: "#f4f1e8",
  backgroundGradient: "radial-gradient(ellipse at 50% 28%, #fbf9f3 0%, #f4f1e8 72%)",
  foreground: "#16232c",
  foregroundMid: "#586a72",
  foregroundLow: "#8a979e",
  primary: "#d94332",
  primaryForeground: "#fffdfa",
  secondary: "#2c7782",
  fontFamily: '"Times New Roman", Georgia, "DejaVu Serif", ui-serif, serif',
  monoFontFamily: monoFont,
  terminal: {
    sceneBackground: "#14313f",
    bg: "#14313f",
    titleBar: "#1b3d4d",
    titleText: "#7fa6b0",
    command: "#f4f1e8",
    output: "#d7e0e2",
    claude: "#e58a7d",
    shadow: "0 14px 34px rgba(22,31,38,0.18)",
    dots: ["#d94332", "#e0a93b", "#2c7782"],
    labelColor: "#586a72",
    successColor: "#2c7782",
    statusBarBg: "#0f2630",
    borderColor: "#2a4a57",
    separatorColor: "#2a4a57",
    costColor: "#7fa6b0",
    userMessageBg: "#1b3d4d",
    userMessageBorder: "#2a4a57",
  },
  card: {
    bg: "#fffdfa",
    bgGradient: "linear-gradient(180deg, #fffdfa 0%, #f7f4ec 100%)",
    border: "#d5d8d2",
    accentBorder: "#d94332",
    shadow: "0 14px 34px rgba(22,31,38,0.09)",
  },
  mascot: {
    show: false,
    cornerScale: 0.5,
    cornerOpacity: 0.7,
    cornerBottom: 20,
    cornerRight: 24,
  },
  overlay: "rgba(244,241,232,0.85)",
  label: "H-alpha · Física solar",
  labelColor: "#9d241c",
  accentLine: "linear-gradient(90deg, #d94332, #2c7782)",
}
```

- [ ] **Step 2: Register the theme in the `themes` record**

Change:

```ts
const themes: Record<ThemeName, ThemeTokens> = {
  default: defaultTheme,
  "linea-directa": lineaDirectaTheme,
  "atom-dark": atomDarkTheme,
}
```

to:

```ts
const themes: Record<ThemeName, ThemeTokens> = {
  default: defaultTheme,
  "linea-directa": lineaDirectaTheme,
  "atom-dark": atomDarkTheme,
  "h-alpha": hAlphaTheme,
}
```

- [ ] **Step 3: Verify it does not yet typecheck**

Run: `npm run lint`
Expected: TypeScript error — `"h-alpha"` is not assignable to `ThemeName` (the enum still lacks it). This is fixed in Task 2. (If you prefer green-at-each-step, do Task 2 Step 1 before re-running.)

---

## Task 2: Allow vertical dimensions and the new theme in the schema

**Files:**

- Modify: `src/compositions/ClaudeCodeTutorial/schema.ts:129-145`

- [ ] **Step 1: Extend the theme enum**

Change line 136:

```ts
  theme: z.enum(["default", "linea-directa", "atom-dark"]).default("default"),
```

to:

```ts
  theme: z.enum(["default", "linea-directa", "atom-dark", "h-alpha"]).default("default"),
```

- [ ] **Step 2: Relax width/height to accept vertical and add the `composition` field**

Change lines 133-135:

```ts
  fps: z.literal(30),
  width: z.literal(1280),
  height: z.literal(720),
```

to:

```ts
  fps: z.literal(30),
  width: z.union([z.literal(1280), z.literal(1080)]),
  height: z.union([z.literal(720), z.literal(1920)]),
  composition: z.string().nullable().optional(),
```

- [ ] **Step 3: Typecheck passes**

Run: `npm run lint`
Expected: PASS (no TypeScript errors). The `h-alpha` theme from Task 1 now satisfies `ThemeName` because `ThemeName = TutorialConfig["theme"]`.

- [ ] **Step 4: Commit**

```bash
git add src/shared/themes/themes.ts src/compositions/ClaudeCodeTutorial/schema.ts
git commit -m "feat(theme): add h-alpha theme and allow vertical tutorial dimensions"
```

---

## Task 3: Register the vertical composition and copy the hero asset

**Files:**

- Modify: `src/Root.tsx`
- Create: `public/images/halpha/sun-h-alpha.png`

- [ ] **Step 1: Copy the solar photo into the Remotion public assets**

Run:

```bash
mkdir -p public/images/halpha
cp /Users/enriquebook/Personal/Developer/H-alpha/public/images/sun-h-alpha.png public/images/halpha/sun-h-alpha.png
```

Expected: file exists at `public/images/halpha/sun-h-alpha.png`.

- [ ] **Step 2: Register the `VerticalShort` composition**

In `src/Root.tsx`, after the existing `ClaudeCodeTutorial` `<Composition>` block (ends at line 73), add:

```tsx
<Composition
  id="VerticalShort"
  component={ClaudeCodeTutorial}
  durationInFrames={300}
  fps={30}
  width={1080}
  height={1920}
  schema={TutorialConfigSchema}
  defaultProps={{
    id: "halpha-solar",
    title: "El Sol en Hα",
    description: "Qué se ve en una imagen solar en H-alpha y por qué",
    composition: "VerticalShort",
    fps: 30 as const,
    width: 1080 as const,
    height: 1920 as const,
    theme: "h-alpha" as const,
    scenes: [
      {
        type: "intro" as const,
        title: "El Sol en Hα",
        subtitle: "Otra forma de ver nuestra estrella",
        durationInSeconds: 4,
      },
    ],
  }}
  calculateMetadata={calculateMetadata}
/>
```

(Reuses the already-imported `ClaudeCodeTutorial`, `TutorialConfigSchema`, and `calculateMetadata` — no new imports needed.)

- [ ] **Step 3: Verify the composition loads in Studio**

Run: `npm run dev`
Expected: Remotion Studio opens; a `VerticalShort` composition appears in the sidebar at 1080×1920 with the paper-cream `h-alpha` background and serif intro. Stop the dev server after confirming.

- [ ] **Step 4: Commit**

```bash
git add src/Root.tsx public/images/halpha/sun-h-alpha.png
git commit -m "feat(video): register VerticalShort composition and add solar hero asset"
```

---

## Task 4: Author the config.json (6 scenes, no audio yet)

**Files:**

- Create: `content/shorts/halpha-solar/config.json`

Scene → component mapping (all props verified against component interfaces):

- Scene 0 `media-card` — hook (solar photo + headline). Props: `imageSrc, imageAlt, title, description?, cta?, layout?`.
- Scene 1 custom `big-number` — 656,28 nm. Props: `title?, metrics:[{value,label,prefix?,suffix?}]`.
- Scene 2 custom `block-diagram` — etalon. Props: `title?, blocks:[{label,detail}]` (≤3 blocks fit 1080px wide).
- Scene 3 custom `flow-diagram` — optical chain. Props: `title, nodes:[{id,title,description?,icon?}], layout:"vertical"`.
- Scene 4 custom `annotated-image` — read the image. Props: `imageSrc, imageAlt, annotations:[{x,y,text,position?}]`.
- Scene 5 `cta` — close + URL. Props: `text, url?`.

- [ ] **Step 1: Write the config**

Create `content/shorts/halpha-solar/config.json`:

```json
{
  "id": "halpha-solar",
  "title": "El Sol en Hα",
  "description": "Qué se ve en una imagen solar en H-alpha y por qué",
  "composition": "VerticalShort",
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "theme": "h-alpha",
  "transition": { "type": "fade", "durationInFrames": 12 },
  "scenes": [
    {
      "type": "custom",
      "componentId": "media-card",
      "durationInSeconds": 8,
      "props": {
        "imageSrc": "images/halpha/sun-h-alpha.png",
        "imageAlt": "Disco solar en H-alpha con filamentos y protuberancias",
        "title": "¿Quieres ver el Sol con otros ojos?",
        "description": "A simple vista es un disco liso y amarillo. En una sola línea de color, se transforma.",
        "layout": "image-left"
      }
    },
    {
      "type": "custom",
      "componentId": "big-number",
      "durationInSeconds": 14,
      "props": {
        "title": "El hidrógeno emite un rojo muy concreto",
        "metrics": [
          { "value": "656,28", "suffix": " nm", "label": "La línea hidrógeno-alfa, donde brilla la cromosfera" }
        ]
      }
    },
    {
      "type": "custom",
      "componentId": "block-diagram",
      "durationInSeconds": 14,
      "props": {
        "title": "Aislar un solo color: el etalon",
        "blocks": [
          { "label": "Dos espejos", "detail": "Dos superficies casi perfectas, muy juntas y paralelas." },
          { "label": "Mil reflexiones", "detail": "La luz rebota miles de veces entre ellas." },
          { "label": "Solo Hα sale", "detail": "Únicamente el rojo de Hα se refuerza. El resto se cancela." }
        ]
      }
    },
    {
      "type": "custom",
      "componentId": "flow-diagram",
      "durationInSeconds": 12,
      "props": {
        "title": "La cadena óptica",
        "layout": "vertical",
        "nodes": [
          { "id": "obj", "title": "Objetivo", "description": "Recoge la luz del Sol" },
          { "id": "erf", "title": "ERF", "description": "Aparta el calor y la energía" },
          { "id": "etalon", "title": "Etalon", "description": "Selecciona la rendija de Hα" },
          { "id": "blocking", "title": "Blocking filter", "description": "Limpia la luz sobrante" },
          { "id": "eye", "title": "Ojo / cámara", "description": "Imagen limpia y segura" }
        ]
      }
    },
    {
      "type": "custom",
      "componentId": "annotated-image",
      "durationInSeconds": 16,
      "props": {
        "imageSrc": "images/halpha/sun-h-alpha.png",
        "imageAlt": "Disco solar en H-alpha anotado",
        "annotations": [
          { "x": 42, "y": 51, "text": "Filamentos", "position": "left" },
          { "x": 40, "y": 37, "text": "Plages", "position": "left" },
          { "x": 48, "y": 38, "text": "Mancha solar", "position": "top" },
          { "x": 69, "y": 31, "text": "Protuberancias", "position": "right" },
          { "x": 57, "y": 60, "text": "Textura cromosférica", "position": "bottom" }
        ]
      }
    },
    {
      "type": "cta",
      "durationInSeconds": 8,
      "text": "La misma estrella, vista en un solo color. Aprende a leer el Sol.",
      "url": "vasallo94.github.io/H-alpha"
    }
  ]
}
```

- [ ] **Step 2: Validate the config against the schema**

Run: `npx tsx scripts/validate-config.ts content/shorts/halpha-solar/config.json`
Expected: validation passes (Zod schema accepts vertical dims, `h-alpha` theme, and all scene shapes). If `validate-config.ts` requires a different invocation, run `make validate TUTORIAL=...` equivalent or `npm run lint` as a fallback typecheck.

- [ ] **Step 3: Commit**

```bash
git add content/shorts/halpha-solar/config.json
git commit -m "feat(video): add halpha-solar config — 6-scene escaleta"
```

---

## Task 5: Render per-scene stills and fix vertical layout

This is the visual verification step (the "test" for visual work). Vertical 9:16 is untested for these scenes; `media-card` (`image-left`) and `block-diagram` (fixed horizontal row) are the likely offenders.

- [ ] **Step 1: Render stills for every scene**

Run: `npx tsx scripts/render-scene-stills.ts content/shorts/halpha-solar/config.json /tmp/halpha-stills`
Expected: one PNG per scene in `/tmp/halpha-stills`.

- [ ] **Step 2: Inspect each still**

Open each PNG (Read tool renders them). Check against acceptance criteria:

- Paper-cream background, serif text, solar-red accents on every scene (no dark `default` theme leaking).
- Scene 0: solar photo and headline both fully visible, not cramped. In 1080-wide vertical, `image-left` may squeeze both columns.
- Scene 2: the 3 etalon blocks fit within frame width (3×280 + 2×60 = 960px < 1080 — should fit; confirm no clipping).
- Scene 3: the 5 optical-chain nodes stack vertically and fit within 1920px height.
- Scene 4: the solar photo is large and the 5 annotations sit over the correct features without overlapping the frame edges.

- [ ] **Step 3: Fix layout issues found (only if needed)**

If Scene 0 is cramped, add an `image-top` stacked layout to `MediaCardScene` (`src/compositions/ClaudeCodeTutorial/scenes/custom/MediaCardScene.tsx`): when `layout === "image-top"`, render a column (image above text) instead of a row, and set the config's scene 0 `layout` to `"image-top"`. Show the actual modified render function in the change. Keep existing `image-left`/`image-right` behavior intact.

If annotation callouts in Scene 4 overflow the frame, adjust the `position` values in the config (e.g. switch an edge annotation from `"right"` to `"left"`) — do not change coordinates.

Re-run Step 1 after each fix until all stills pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(video): adjust vertical layout for halpha-solar scenes"
```

---

## Task 6: Add voiceover (sober male) and director pass

**Files:**

- Modify: `content/shorts/halpha-solar/config.json`

Narration text is final (from the approved spec). Sober delivery = high `stability`, low `style`.

- [ ] **Step 1: Add the `voiceover` and `subtitles` blocks**

Append these top-level keys to the config (sibling of `scenes`):

```json
  "voiceover": {
    "enabled": true,
    "provider": "elevenlabs",
    "voiceId": "y6WtESLj18d0diFRruBs",
    "language": "es",
    "elevenlabs": {
      "modelId": "eleven_multilingual_v2",
      "outputFormat": "mp3_44100_128",
      "seed": 42,
      "applyTextNormalization": "on",
      "voiceSettings": { "stability": 0.55, "similarityBoost": 0.8, "style": 0.1, "useSpeakerBoost": true, "speed": 1.0 }
    },
    "scenes": {
      "0": { "text": "A simple vista, el Sol es un disco liso y amarillo. Pero en una sola línea de color, se transforma.", "leadInMs": 600, "audioStartMs": 600, "tailHoldMs": 500 },
      "1": { "text": "El Sol es casi todo hidrógeno, y el hidrógeno emite un rojo muy concreto: la línea hidrógeno-alfa. En ese color brilla la cromosfera, una capa fina que la luz blanca normalmente esconde.", "leadInMs": 400, "audioStartMs": 400, "tailHoldMs": 500 },
      "2": { "text": "Para quedarse solo con ese rojo, un telescopio de hidrógeno-alfa usa un etalon: dos espejos casi perfectos. La luz rebota miles de veces y solo una nota, la de hidrógeno-alfa, sale reforzada. Todo lo demás se cancela.", "leadInMs": 400, "audioStartMs": 400, "tailHoldMs": 500 },
      "3": { "text": "Pero el etalon no trabaja solo. Antes, un filtro aparta el calor; después, otro limpia la luz sobrante. Sin esa cadena, ni hay imagen, ni hay seguridad.", "leadInMs": 400, "audioStartMs": 400, "tailHoldMs": 500 },
      "4": { "text": "Y ahora ya sabes leer lo que ves: filamentos oscuros, plages brillantes, manchas, protuberancias en el borde, y la textura de espículas que da el aspecto granulado.", "leadInMs": 500, "audioStartMs": 500, "tailHoldMs": 600 },
      "5": { "text": "La misma estrella, vista en un solo color. Tienes la explicación completa, paso a paso, en la web.", "leadInMs": 400, "audioStartMs": 400, "tailHoldMs": 1200 }
    }
  },
  "subtitles": { "enabled": true, "style": "karaoke", "fontSize": 34, "position": "bottom" }
```

- [ ] **Step 2: Director pass (timing + beats)**

Invoke the `remotion-director` skill on `content/shorts/halpha-solar/config.json` to add `brief`, per-scene `timing`, and `beats` (narrative sync). Keep the sober tone: no dramatic emphasis beats. The director keeps narration text unchanged.

- [ ] **Step 3: Generate voiceover audio**

Run: `npx tsx scripts/generate-voiceover.ts content/shorts/halpha-solar/config.json`
Expected: `public/voiceover/halpha-solar/0.mp3 … 5.mp3` plus `.timestamps.json` files. Listen to one clip and confirm the delivery is calm, not theatrical. If too dramatic, lower `style` further (e.g. 0.05) and regenerate.

- [ ] **Step 4: Commit**

```bash
git add content/shorts/halpha-solar/config.json
git commit -m "feat(video): add sober voiceover and director pass to halpha-solar"
```

---

## Task 7: Add minimal, sober sound design

**Files:**

- Modify: `content/shorts/halpha-solar/config.json`

- [ ] **Step 1: Sound chart**

Invoke the `sound-engineer` skill on `content/shorts/halpha-solar/config.json`. Constraints to pass it explicitly: ambient/atmospheric music bed only (no braams, no dramatic stingers), gentle ducking under voice. A single soft outro tag at most. The chart must be approved by the user before generation (the skill handles the AskUserQuestion).

- [ ] **Step 2: Generate audio assets**

Run: `npx tsx scripts/generate-sound-design.ts content/shorts/halpha-solar/config.json`
Expected: `public/audio/halpha-solar/music-bed.mp3` and any `sfx-*.mp3`.

- [ ] **Step 3: Commit**

```bash
git add content/shorts/halpha-solar/config.json
git commit -m "feat(sound): add sober ambient sound design to halpha-solar"
```

---

## Task 8: Final render and acceptance check

- [ ] **Step 1: Render the video**

Run: `npx tsx scripts/render.ts content/shorts/halpha-solar/config.json`
Expected: `content/shorts/halpha-solar/output.mp4` produced, ~75–82s, no errors.

- [ ] **Step 2: Verify against acceptance criteria**

- 1080×1920, 30fps, ~75–82s. (Check with `ffprobe content/shorts/halpha-solar/output.mp4` for dimensions/duration.)
- Theme: paper-cream + serif + solar-red throughout; no `default` theme leak.
- Scene 4 shows the 5 structures over the real photo at the right positions.
- Voice is calm; subtitles are single-word karaoke.
- Music is ambient with ducking; no dramatic SFX.

- [ ] **Step 3: Update CHANGELOG**

Add under `[Unreleased] > Added` in `CHANGELOG.md`:

```markdown
- **`content/shorts/halpha-solar/`** — vertical 1080×1920 LinkedIn short presenting the H-alpha solar-physics website; new `h-alpha` theme cloning the site palette and a reusable `VerticalShort` composition
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog entry for halpha-solar video"
```

- [ ] **Step 5: Watch the output and present to the user for review.**

---

## Self-Review (completed)

- **Spec coverage:** theme (T1), vertical composition (T2-T3), assets (T3), 6-scene escaleta with real annotation coords (T4), vertical layout safety (T5), sober voiceover (T6), minimal sound (T7), render + acceptance (T8). All spec sections mapped.
- **Placeholder scan:** narration text, theme tokens, schema diffs, config JSON, and commands are all concrete. The only conditional code (MediaCard `image-top`) is gated on a still-inspection finding and describes the exact change.
- **Type consistency:** `composition` field added to schema is read by `render.ts` (`config.composition`); `VerticalShort` id matches the config's `composition` value; annotation props use `{x,y,text,position}` matching `AnnotatedImageScene`; `flow-diagram` uses `layout:"vertical"` matching `FlowDiagramProps`.
