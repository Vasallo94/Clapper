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

Registered in `customSceneRegistry.ts`. Use `type: "custom"` with the `componentId`.

**CRITICAL:** Each component has specific required props. Using wrong prop names produces blank scenes. The `audit_content_quality` tool validates required props — always run it before checkpoints.

### big-number

Large animated statistic with counter animation.

| Prop    | Type                                                                 | Required | Notes                                                                                      |
| ------- | -------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| metrics | `{value: string, label: string, prefix?: string, suffix?: string}[]` | yes      | Array of metrics to animate. Non-numeric values (e.g. "Photon") display after 50% progress |
| title   | string                                                               | no       | Optional heading above metrics                                                             |

```json
{
  "type": "custom",
  "componentId": "big-number",
  "props": { "metrics": [{ "value": "3.9x", "label": "Faster" }] },
  "durationInSeconds": 7
}
```

### code-block

Syntax-highlighted code with optional line highlighting.

| Prop           | Type     | Required | Notes                                                               |
| -------------- | -------- | -------- | ------------------------------------------------------------------- |
| code           | string   | yes      | Source code (use `\n` for line breaks)                              |
| language       | string   | yes      | Language for syntax coloring (e.g. `"scala"`, `"python"`, `"yaml"`) |
| title          | string   | no       | Heading above code                                                  |
| filename       | string   | no       | Filename shown in code header                                       |
| highlightLines | number[] | no       | 1-indexed lines to highlight                                        |

### comparison-table

Side-by-side feature comparison.

| Prop        | Type                                | Required | Notes             |
| ----------- | ----------------------------------- | -------- | ----------------- |
| title       | string                              | yes      | Table heading     |
| leftColumn  | `{header: string, items: string[]}` | yes      | Left column data  |
| rightColumn | `{header: string, items: string[]}` | yes      | Right column data |

```json
{
  "type": "custom",
  "componentId": "comparison-table",
  "props": {
    "title": "A vs B",
    "leftColumn": { "header": "A", "items": ["Fast", "Typed"] },
    "rightColumn": { "header": "B", "items": ["Slow", "Untyped"] }
  },
  "durationInSeconds": 15
}
```

### file-explorer

File tree with expandable file content panel.

| Prop        | Type                                                                         | Required | Notes                                                        |
| ----------- | ---------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| rootPath    | string                                                                       | yes      | Root directory label (e.g. `"my-project/"`)                  |
| files       | `{name: string, type: "file"\|"folder", indent?: number, isNew?: boolean}[]` | yes      | File tree entries                                            |
| expandFile  | string                                                                       | yes      | Filename to expand in content panel                          |
| fileContent | string                                                                       | yes      | Content shown in expanded panel (supports `---` frontmatter) |
| calloutText | string                                                                       | no       | Optional callout overlay at bottom                           |

### before-after

Side-by-side comparison with labeled columns.

| Prop       | Type     | Required | Notes                                 |
| ---------- | -------- | -------- | ------------------------------------- |
| leftItems  | string[] | yes      | Items for left column                 |
| rightItems | string[] | yes      | Items for right column                |
| title      | string   | no       | Section heading                       |
| leftLabel  | string   | no       | Left column label (default: "Before") |
| rightLabel | string   | no       | Right column label (default: "After") |

### block-diagram

Architecture block diagram with connected blocks.

| Prop   | Type                                                                                                                                   | Required | Notes                               |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------- |
| blocks | `{id: string, label: string, sublabel?: string, row: number, col: number, colSpan?: number, color?: string, connections?: string[]}[]` | yes      | Array of blocks with grid positions |
| title  | string                                                                                                                                 | no       | Diagram heading                     |

### flow-diagram

Flow/process diagram with description.

| Prop        | Type   | Required | Notes                                                                     |
| ----------- | ------ | -------- | ------------------------------------------------------------------------- |
| title       | string | yes      | Diagram title (parsed as `step1 → step2 → step3` or displayed as heading) |
| description | string | yes      | Explanation text below                                                    |

### bullet-slide

Bullet point slide with title.

| Prop     | Type                              | Required | Notes                  |
| -------- | --------------------------------- | -------- | ---------------------- |
| title    | string                            | yes      | Slide heading          |
| items    | `{text: string, icon?: string}[]` | yes      | Bullet items           |
| subtitle | string                            | no       | Subtitle below heading |

### quote

Styled quotation with attribution.

| Prop   | Type   | Required | Notes               |
| ------ | ------ | -------- | ------------------- |
| text   | string | yes      | Quote text          |
| author | string | no       | Attribution name    |
| role   | string | no       | Author's role/title |

### step-list

Numbered step sequence.

| Prop  | Type                                      | Required | Notes           |
| ----- | ----------------------------------------- | -------- | --------------- |
| steps | `{title: string, description?: string}[]` | yes      | Ordered steps   |
| title | string                                    | no       | Section heading |

### Other registered components

| componentId      | Required props                                         |
| ---------------- | ------------------------------------------------------ |
| annotated-image  | `annotations`                                          |
| api-request      | `method`, `endpoint`, `responseStatus`, `responseBody` |
| bar-chart        | `items`                                                |
| browser-mockup   | `url`, `content`                                       |
| chapter-card     | `title`                                                |
| code-diff        | `fileName`, `additions`, `deletions`                   |
| countdown        | (all optional)                                         |
| icon-grid        | `items`                                                |
| logo-wall        | `items`                                                |
| media-card       | `title`                                                |
| problem-solution | `problem`, `solution`                                  |
| progress-bars    | `items`                                                |
| split-screen     | `left`, `right`                                        |
| stat-reveal      | `value`                                                |
| timeline         | `items`                                                |
| two-column-text  | `left`, `right`                                        |

## CRITICAL: durationInSeconds

Every scene MUST use `"durationInSeconds"` (a number). NEVER use `durationInFrames`, `duration`, or any other name.
