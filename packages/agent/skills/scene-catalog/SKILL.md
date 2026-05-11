---
name: scene-catalog
description: Catalogo completo de escenas disponibles para generacion de videos Remotion. Tipos de escena con campos, restricciones de duracion, y 26 componentes custom registrados. Usala al generar configs, validar escenas, o crear componentes custom.
---

# Scene Catalog

Reference catalog of all available scene types for video generation. Every scene requires `type` and `durationInSeconds` fields.

All scenes accept optional direction fields: `timing` (leadInMs, audioStartMs, tailHoldMs, transitionMs) and `beats` (array of narration/visual/animation cues with startMs/endMs).

## How agents should use the catalog

Before writing scenes, choose a **video template** and then choose scenes by narrative role:

1. Call `query_scene_catalog("template")` to inspect available templates.
2. Pick the template whose `bestFor`, `avoidWhen`, composition, and target duration match the request.
3. Write `brief.templateId` and `brief.narrativeArc` into the config so downstream agents preserve the story shape.
4. Use the template `steps` as the first draft of the escaleta.
5. Replace a preferred scene only when the scene catalog says another scene is better for that role.
6. If you deviate from the template, mention the reason in the escaleta checkpoint.

Scene metadata fields:

- `narrativeRoles` — what job the scene performs in the story.
- `bestFor` — when to use the scene.
- `avoidWhen` — when to choose a different scene.
- `textLimits` — visible-copy budget for readable Remotion output.
- `durationRange` — recommended seconds, separate from schema max/min.
- `recommendedBeats` — default number of director beats for the scene.
- `placement` — first, middle, near-end, or last.

## Video templates

Templates are narrative guides, not rigid schemas. Use them to avoid generic videos.

| templateId                       | Composition        | Best for                                                     |
| -------------------------------- | ------------------ | ------------------------------------------------------------ |
| `tutorial-code-walkthrough`      | ClaudeCodeTutorial | Codex/Claude Code command tutorials with a realistic demo    |
| `tutorial-agent-pipeline`        | ClaudeCodeTutorial | DeepAgents, multi-agent workflows, generated artifacts       |
| `product-short-offer`            | ProductShort       | Linea Directa offer-led vertical ads with price or clear CTA |
| `product-short-problem-solution` | ProductShort       | Vertical ads where the pain point is stronger than the offer |

Query a template by id for its steps:

```text
query_scene_catalog("tutorial-code-walkthrough")
```

## ClaudeCodeTutorial (1280x720 landscape)

### intro

Opening title card with animated lockup.

| Field             | Type   | Required | Notes                                                                     |
| ----------------- | ------ | -------- | ------------------------------------------------------------------------- |
| title             | string | yes      | Main title text                                                           |
| subtitle          | string | no       | Secondary text below title                                                |
| pixelLogo         | object | no       | `{ enabled, scale (1-12), animation: "none"\|"build"\|"glint"\|"pulse" }` |
| durationInSeconds | number | yes      | 1-30                                                                      |

```json
{ "type": "intro", "title": "...", "subtitle": "...", "durationInSeconds": 3 }
```

### terminal

Simulated Claude Code CLI session with typewriter/streaming effects.

| Field             | Type   | Required | Notes                                             |
| ----------------- | ------ | -------- | ------------------------------------------------- |
| title             | string | no       | Scene heading                                     |
| lines             | array  | yes      | Min 1 line. Each: `{ kind, text, delayAfterMs? }` |
| durationInSeconds | number | yes      | 2-120                                             |

Line kinds and rendering speeds:

- `command`: user typing (typewriter, ~0.5 chars/frame)
- `claude`: AI response (streaming, ~1 char/frame, 18-frame gap between lines)
- `output`: tool output (instant reveal, 8 frames)
- `blank`: visual separator

```json
{
  "type": "terminal",
  "lines": [
    { "kind": "command", "text": "claude 'explain this code'" },
    { "kind": "claude", "text": "This function validates user input..." },
    { "kind": "output", "text": "Done in 1.2s" }
  ],
  "durationInSeconds": 10
}
```

### callout

Highlighted text overlay for key points.

| Field             | Type   | Required | Notes                                            |
| ----------------- | ------ | -------- | ------------------------------------------------ |
| text              | string | yes      | Callout message                                  |
| position          | enum   | yes      | `"top"` \| `"center"` \| `"bottom"` \| `"right"` |
| background        | enum   | no       | `"overlay"` (default) \| `"solid"`               |
| durationInSeconds | number | yes      | 1-15                                             |

### outro

Closing card with summary bullets.

| Field             | Type     | Required | Notes          |
| ----------------- | -------- | -------- | -------------- |
| title             | string   | yes      | Closing title  |
| bullets           | string[] | no       | Summary points |
| durationInSeconds | number   | yes      | 2-20           |

### custom

Renders a registered custom component by `componentId`. See Custom Components below.

| Field             | Type   | Required | Notes                                      |
| ----------------- | ------ | -------- | ------------------------------------------ |
| componentId       | string | yes      | Must match a registered ID                 |
| props             | object | no       | Arbitrary props forwarded to the component |
| durationInSeconds | number | yes      | 1-120                                      |

## ProductShort (1080x1920 vertical)

### hero

Opening vertical hero card.

| Field             | Type   | Required | Notes           |
| ----------------- | ------ | -------- | --------------- |
| title             | string | yes      | Hero title      |
| subtitle          | string | no       | Supporting text |
| durationInSeconds | number | yes      | 1-10            |

### benefits

Animated benefit items list.

| Field             | Type   | Required | Notes                                                   |
| ----------------- | ------ | -------- | ------------------------------------------------------- |
| title             | string | no       | Section heading                                         |
| items             | array  | yes      | Min 1. Each item MUST be an object: `{ "text": "..." }` |
| durationInSeconds | number | yes      | 2-15                                                    |

**CRITICAL:** `items` must be an array of objects, NOT an array of strings. This crashes the render:

```json
"items": ["Wrong", "Also wrong"]
```

Correct format:

```json
"items": [{ "text": "Correct" }, { "text": "Also correct" }]
```

### pricing

Price display card.

| Field             | Type   | Required | Notes                    |
| ----------------- | ------ | -------- | ------------------------ |
| price             | string | yes      | e.g. "desde 180 EUR/ano" |
| period            | string | no       | e.g. "al ano"            |
| note              | string | no       | Small print              |
| variant           | enum   | yes      | `"light"` \| `"dark"`    |
| durationInSeconds | number | yes      | 1-10                     |

### cta

Call-to-action closing card.

| Field             | Type   | Required | Notes      |
| ----------------- | ------ | -------- | ---------- |
| text              | string | yes      | CTA text   |
| url               | string | no       | Target URL |
| durationInSeconds | number | yes      | 1-10       |

## Custom Components

Registered in `customSceneRegistry.ts`. Use `type: "custom"` with the `componentId`:

| componentId      | Description                        |
| ---------------- | ---------------------------------- |
| annotated-image  | Image with positioned annotations  |
| api-request      | API request/response visualization |
| bar-chart        | Animated bar chart                 |
| before-after     | Side-by-side comparison            |
| big-number       | Large animated statistic           |
| block-diagram    | Architecture block diagram         |
| browser-mockup   | Browser window mockup              |
| bullet-slide     | Bullet point slide                 |
| chapter-card     | Chapter title card                 |
| code-block       | Syntax-highlighted code            |
| code-diff        | Code diff visualization            |
| comparison-table | Feature comparison table           |
| countdown        | Countdown animation                |
| file-explorer    | File tree visualization            |
| flow-diagram     | Flow/process diagram               |
| icon-grid        | Grid of icons with labels          |
| logo-wall        | Grid of logos                      |
| media-card       | Image/video card                   |
| problem-solution | Problem vs solution split          |
| progress-bars    | Animated progress bars             |
| quote            | Styled quotation                   |
| split-screen     | Two-panel layout                   |
| stat-reveal      | Animated statistic reveal          |
| step-list        | Numbered step sequence             |
| timeline         | Timeline visualization             |
| two-column-text  | Two-column text layout             |

## CRITICAL: durationInSeconds

Every scene MUST use `"durationInSeconds"` (a number). NEVER use `durationInFrames`, `duration`, or any other name.
