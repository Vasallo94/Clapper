# Scene Catalog

Available scene types for video generation. Each scene has a `type` field and `durationInSeconds`.

All scenes accept optional direction fields: `timing` (leadInMs, audioStartMs, tailHoldMs, transitionMs) and `beats` (array of narration/visual/animation cues with startMs/endMs).

## ClaudeCodeTutorial (1280x720 landscape)

### intro

Opening title card with animated lockup.

| Field             | Type   | Required | Notes                                                                     |
| ----------------- | ------ | -------- | ------------------------------------------------------------------------- |
| title             | string | yes      | Main title text                                                           |
| subtitle          | string | no       | Secondary text below title                                                |
| pixelLogo         | object | no       | `{ enabled, scale (1-12), animation: "none"\|"build"\|"glint"\|"pulse" }` |
| durationInSeconds | number | yes      | 1-30                                                                      |

### terminal

Simulated Claude Code CLI session with typewriter/streaming effects.

| Field             | Type   | Required | Notes                                                                                     |
| ----------------- | ------ | -------- | ----------------------------------------------------------------------------------------- |
| title             | string | no       | Scene heading                                                                             |
| lines             | array  | yes      | Min 1 line. Each: `{ kind: "command"\|"output"\|"claude"\|"blank", text, delayAfterMs? }` |
| durationInSeconds | number | yes      | 2-120                                                                                     |

Line rendering speeds: command = 0.5 chars/frame, claude = 1 char/frame (18-frame gap between lines), output = instant (8 frames).

### callout

Highlighted text overlay for key points or transitions.

| Field             | Type                     | Required | Notes               |
| ----------------- | ------------------------ | -------- | ------------------- |
| text              | string                   | yes      | Callout message     |
| position          | "top"\|"bottom"\|"right" | yes      | Placement on screen |
| background        | "overlay"\|"solid"       | no       | Default "overlay"   |
| durationInSeconds | number                   | yes      | 1-15                |

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

| Field             | Type   | Required | Notes                   |
| ----------------- | ------ | -------- | ----------------------- |
| title             | string | no       | Section heading         |
| items             | array  | yes      | Min 1. Each: `{ text }` |
| durationInSeconds | number | yes      | 2-15                    |

### pricing

Price display with optional period and note.

| Field             | Type            | Required | Notes                    |
| ----------------- | --------------- | -------- | ------------------------ |
| price             | string          | yes      | e.g. "desde 180 EUR/ano" |
| period            | string          | no       | e.g. "al ano"            |
| note              | string          | no       | Small print              |
| variant           | "light"\|"dark" | yes      | Color scheme             |
| durationInSeconds | number          | yes      | 1-10                     |

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
