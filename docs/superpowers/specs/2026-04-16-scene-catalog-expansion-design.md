# Scene Catalog Expansion — Design Spec

**Date:** 2026-04-16
**Scope:** 16 new custom scene components + 1 replacement for ClaudeCodeTutorial (horizontal, 1280x720)
**Approach:** Catalogue by categories — independent scenes registered in `customSceneRegistry.ts`

## Context

The horizontal composition has 5 core scenes (intro, terminal, callout, outro, custom) and 10 custom scenes focused on technical tutorials. The current set is functional but lacks:

- **Narrative transitions** — no before/after, problem/solution, or timeline scenes
- **Data visualization** — only `big-number` exists; no charts, progress bars, or dramatic stat reveals
- **Demo capabilities** — only `terminal` for technical demos; no browser mockups, API visualizations, or code diffs
- **General presentation** — missing image+text layouts, logo walls, step lists

This expansion makes the scene library **generic and reusable** — suitable for tutorials, corporate presentations, social media videos, and any other content type.

## Architecture decisions

- **All new scenes are custom components** registered in `customSceneRegistry.ts`, invoked via `type: "custom"` with `componentId`. No changes to the core schema.
- **`chapter-card` replaces `section-title`** — same purpose but richer (description field, more visual presence). `section-title` will be removed from the registry and its component deleted.
- All scenes follow existing patterns: `useCurrentFrame()` + `spring()`/`interpolate()` for animation, `useThemeTokens()` for theming, `useSlideIn()` hook where appropriate.
- All scenes support the shared `DirectionSceneFields` (timing, beats) for voiceover synchronization.
- Each scene gets a Zod schema for its props, registered alongside the component.

## Category 1: Narrative and Transition

### 1.1 before-after

Two side-by-side panels with "Before"/"After" labels (configurable). Left panel appears first with slide-in, then an animated arrow/connector, then the right panel reveals. Left panel uses a red-tinted accent, right uses green-tinted.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Scene title above the panels |
| leftLabel | string | no | Label for left panel (default: "Before") |
| leftItems | string[] | yes | Bullet points for left panel |
| rightLabel | string | no | Label for right panel (default: "After") |
| rightItems | string[] | yes | Bullet points for right panel |
| leftAccent | string | no | Color override for left panel border |
| rightAccent | string | no | Color override for right panel border |

**Animation sequence:**

1. Title slides in from below (if present)
2. Left panel slides in from left (spring, 0.3s)
3. Arrow/connector animates (0.2s)
4. Right panel slides in from right (spring, 0.3s)

### 1.2 problem-solution

Vertical layout with two blocks connected by a gradient line (red→green). The problem block appears first, pause, then the line grows downward and reveals the solution. More dramatic than before-after.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Scene title |
| problem | {icon?: string, text: string} | yes | Problem statement |
| solution | {icon?: string, text: string} | yes | Solution statement |

**Animation sequence:**

1. Title fades in (if present)
2. Problem block with red circle icon slides in from left (0.3s)
3. Gradient connector line grows downward (0.4s)
4. Solution block with green check icon slides in from left (0.3s)

### 1.3 timeline

Vertical timeline with circular nodes connected by a line. Nodes illuminate sequentially from top to bottom. Completed nodes show solid fill, future nodes remain outline only.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Scene title |
| items | {date: string, text: string, status?: "past"\|"current"\|"future"}[] | yes | Timeline entries |

**Animation sequence:**

1. Title slides in (if present)
2. Vertical line draws from top to bottom
3. Each node illuminates with stagger (0.3s apart), filling with primary color for past/current status
4. Current node gets a subtle pulse glow

### 1.4 quote

Centered quote with large decorative quotation marks. Text appears with fade, then attribution with optional avatar circle.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| text | string | yes | The quote text |
| author | string | no | Attribution name |
| role | string | no | Author's title/role |
| avatarUrl | string | no | URL to avatar image |
| accentColor | string | no | Color for the quotation marks |

**Animation sequence:**

1. Decorative quotation marks fade in at 30% opacity (0.2s)
2. Quote text fades in with subtle scale (0.4s)
3. Divider line grows horizontally (0.2s)
4. Avatar + author + role slide up (0.3s)

### 1.5 chapter-card (replaces section-title)

Interstitial section divider with large semitransparent number background, prominent title, accent line, and description. Replaces `section-title` which lacked description and visual richness.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| number | string | no | Large background number (e.g. "03") |
| title | string | yes | Section title |
| subtitle | string | no | Short subtitle |
| description | string | no | Longer description text below the accent line |

**Animation sequence:**

1. Number fades in at 15% opacity (160px font, centered)
2. Title slides up and overlaps the number (0.3s)
3. Accent line grows horizontally (0.2s)
4. Subtitle fades in (0.2s)
5. Description fades in (0.2s)

**Migration:** Remove `section-title` from `customSceneRegistry.ts` and delete `SectionTitleScene.tsx`. Existing configs using `section-title` should be updated to `chapter-card` (props are a superset).

## Category 2: Data and Visual Impact

### 2.1 stat-reveal

Single hero metric with dramatic reveal. The number animates from 0 to target with a counter effect, then suffix bounces in, and optionally a progress bar fills below. Designed for maximum visual impact on ONE data point (vs `big-number` which shows multiple KPIs in a row).

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| value | number | yes | Target number |
| suffix | string | no | Unit/suffix (e.g. "%", "x", "ms") |
| prefix | string | no | Prefix (e.g. "$", "#") |
| label | string | no | Label above the number |
| sublabel | string | no | Description below the number |
| showBar | boolean | no | Whether to show a progress bar |
| barPercent | number | no | Fill percentage for the bar (0-100) |

**Animation sequence:**

1. Label fades in (0.2s)
2. Number counts from 0 to value (0.8s, easing out)
3. Prefix/suffix bounce in (spring, 0.15s)
4. Sublabel fades in (0.2s)
5. Progress bar fills from left (0.4s, if showBar)

### 2.2 progress-bars

Stacked horizontal bars that fill sequentially with spring animation. Each bar has a label on the left and percentage on the right.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Scene title |
| items | {label: string, value: number (0-100), color?: string}[] | yes | Bar entries |

**Animation sequence:**

1. Title slides in (if present)
2. Bar labels appear instantly
3. Bars fill left-to-right with spring, staggered 0.25s apart top-to-bottom
4. Percentage values counter-animate alongside bar fill

### 2.3 bar-chart

Vertical bar chart where bars grow upward from the base with spring animation. Each bar has a label below and value above.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Chart title |
| items | {label: string, value: number, color?: string}[] | yes | Bar data points |
| highlightIndex | number | no | Index of bar to highlight with different color |
| showValues | boolean | no | Whether to show value labels above bars (default: true) |

**Animation sequence:**

1. Title slides in (if present)
2. Baseline appears
3. Bars grow upward with spring, staggered 0.15s left-to-right
4. Value labels counter-animate as bars grow
5. Highlighted bar uses primary color, others use secondary

### 2.4 countdown

Countdown display with flip-clock style digit boxes. Digits tick down frame-by-frame. The last time segment highlights in primary color.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Text above the countdown |
| targetLabel | string | no | Text below the countdown (e.g. product name) |
| days | number | no | Starting days value |
| hours | number | no | Starting hours value |
| minutes | number | no | Starting minutes value |
| seconds | number | no | Starting seconds value |

**Animation sequence:**

1. Title fades in (0.2s)
2. Digit boxes scale in with spring (staggered, 0.1s each)
3. Digits tick down continuously frame-by-frame from the starting values
4. The smallest non-zero time unit box has primary color accent border
5. targetLabel fades in below (0.3s)

## Category 3: Demo and Technical

### 3.1 browser-mockup

Browser window with chrome (traffic light dots, URL bar). Interior content is defined as simple block types that reveal with stagger from top to bottom, simulating a page loading.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| url | string | yes | URL displayed in the address bar |
| title | string | no | Scene title above the browser |
| variant | "light"\|"dark" | no | Page content theme (default: "light") |
| content | {type: "header"\|"card-row"\|"text"\|"placeholder"\|"button", text?: string}[] | yes | Content blocks inside the browser |

**Animation sequence:**

1. Title slides in (if present)
2. Browser chrome appears with fade (0.2s)
3. URL types out in address bar (typewriter, 0.3s)
4. Content blocks reveal staggered top-to-bottom (0.15s apart)

### 3.2 api-request

Two panels: Request (left, green accent) and Response (right, blue accent) with formatted code. Request appears first with typewriter, then the arrow animates, and response reveals.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Scene title |
| method | "GET"\|"POST"\|"PUT"\|"DELETE"\|"PATCH" | yes | HTTP method (shown as colored badge) |
| endpoint | string | yes | API endpoint path |
| requestBody | string | no | Request body (formatted as JSON) |
| responseStatus | number | yes | HTTP response status code |
| responseBody | string | yes | Response body (formatted as JSON) |
| language | "json"\|"curl" | no | Request format (default: "json") |

**Animation sequence:**

1. Title slides in (if present)
2. Method badge appears with scale-in
3. Request panel: endpoint + body typewrite line by line (0.5s)
4. Arrow animates left-to-right (0.2s)
5. Response panel: status code appears, then body reveals line by line (0.5s)
6. Status code colored green (2xx) or red (4xx/5xx)

### 3.3 code-diff

GitHub-style diff view with deleted lines in red and added lines in green. Header shows filename and +N -N badge. Lines reveal sequentially.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| fileName | string | yes | File name displayed in header |
| additions | string[] | yes | Lines added (shown in green) |
| deletions | string[] | yes | Lines removed (shown in red) |
| context | {before?: string[], after?: string[]} | no | Unchanged context lines |
| title | string | no | Scene title above the diff |

**Animation sequence:**

1. Title slides in (if present)
2. Header with filename and badge appears (0.2s)
3. Context lines (before) appear instantly
4. Deleted lines reveal with red flash, staggered (0.15s apart)
5. Added lines reveal with green flash, staggered (0.15s apart)
6. Context lines (after) appear

### 3.4 annotated-image

Image or screenshot with positioned callout bubbles. Callouts appear sequentially with spring, each with a number, text, and pointer toward the relevant area.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| imageSrc | string | no | URL to the image (if omitted, shows a styled placeholder) |
| imageAlt | string | no | Alt text / placeholder label |
| annotations | {x: number (0-100), y: number (0-100), text: string, position?: "top"\|"bottom"\|"left"\|"right"}[] | yes | Annotation callouts |

**Animation sequence:**

1. Image fades in with subtle scale (0.3s)
2. Each annotation springs in sequentially (0.4s stagger):
   - Numbered circle appears at (x%, y%)
   - Callout bubble expands from the circle in the configured direction
   - Text fades in inside the bubble

## Category 4: Presentation

### 4.1 media-card

Image on one side, text on the other with title, description, and optional CTA button. Layout configurable: image-left or image-right.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| imageSrc | string | no | URL to image (placeholder if omitted) |
| imageAlt | string | no | Image description |
| title | string | yes | Card title |
| description | string | no | Card body text |
| cta | string | no | Call-to-action button text |
| layout | "image-left"\|"image-right" | no | Image position (default: "image-left") |

**Animation sequence:**

1. Image fades in with subtle scale (0.3s)
2. Title slides up (0.25s)
3. Description fades in (0.2s)
4. CTA button slides up with spring (0.2s)

### 4.2 logo-wall

Grid of company/technology logos with a title. Logos appear with fade+scale staggered. Each cell accepts an image URL or text label.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Section title (e.g. "Trusted by") |
| items | {src?: string, label?: string}[] | yes | Logo entries |
| columns | 3\|4\|6 | no | Grid columns (default: auto based on item count) |

**Animation sequence:**

1. Title fades in (0.2s)
2. Logo cells appear with fade+scale, staggered 0.1s apart, in reading order (left-to-right, top-to-bottom)

### 4.3 two-column-text

Two text blocks side by side with an animated vertical separator. Each column has its own title and body.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Scene title above columns |
| left | {title: string, body: string} | yes | Left column content |
| right | {title: string, body: string} | yes | Right column content |

**Animation sequence:**

1. Scene title slides in (if present)
2. Left column title + body slide in from left (0.3s)
3. Vertical separator line grows from center outward (0.2s)
4. Right column title + body slide in from right (0.3s)

### 4.4 step-list

Numbered vertical list with circular step indicators connected by lines. Steps reveal sequentially top-to-bottom with the connecting line growing between each.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | no | Scene title |
| steps | {title: string, description?: string, status?: "completed"\|"current"\|"pending"}[] | yes | Step entries |

**Animation sequence:**

1. Scene title slides in (if present)
2. Steps reveal sequentially (0.4s stagger):
   - Numbered circle scales in (solid fill for completed, outline for current/pending)
   - Title + description fade in beside the circle
   - Connecting line grows downward to the next step
3. Current step circle gets a subtle pulse glow

## Implementation guidelines

### File structure

Each scene is a single file in `src/compositions/ClaudeCodeTutorial/scenes/custom/`:

```
scenes/custom/
├── BeforeAfterScene.tsx
├── ProblemSolutionScene.tsx
├── TimelineScene.tsx
├── QuoteScene.tsx
├── ChapterCardScene.tsx      (replaces SectionTitleScene.tsx)
├── StatRevealScene.tsx
├── ProgressBarsScene.tsx
├── BarChartScene.tsx
├── CountdownScene.tsx
├── BrowserMockupScene.tsx
├── ApiRequestScene.tsx
├── CodeDiffScene.tsx
├── AnnotatedImageScene.tsx
├── MediaCardScene.tsx
├── LogoWallScene.tsx
├── TwoColumnTextScene.tsx
└── StepListScene.tsx
```

### Patterns to follow

- **Theming:** `useThemeTokens()` for all colors. Never hardcode colors or check theme name.
- **Animation:** `useCurrentFrame()` + `spring()` + `interpolate()` only. No CSS transitions.
- **Slide-in:** Use `useSlideIn()` hook for the common "enter from below" pattern.
- **Beat sync:** Read `beats` from props for voiceover synchronization where applicable.
- **Icon library:** Reuse the existing SVG icon set from `bullet-slide` (terminal, cloud, code, folder, shield, gear, user, book, lightbulb, layers, link, check, file, arrow).
- **Mascot watermark:** Include `<MascotWatermark />` in scenes where it makes sense (narrative scenes, presentation scenes). Skip it for dense data/demo scenes.

### Registry changes

In `customSceneRegistry.ts`:

- Add 16 new entries mapping componentId to component
- Remove `section-title` entry
- Add static imports for all 16 new components + remove SectionTitleScene import

### Schema validation

Each scene's props should have a corresponding Zod schema. These can be defined inline in each component file (consistent with existing custom scenes) and don't need to be added to the top-level `TutorialConfigSchema` since they flow through the generic `custom` scene type.

## Summary

| Category             | Scenes                                                        | Count   |
| -------------------- | ------------------------------------------------------------- | ------- |
| Narrative/Transition | before-after, problem-solution, timeline, quote, chapter-card | 5       |
| Data/Impact          | stat-reveal, progress-bars, bar-chart, countdown              | 4       |
| Demo/Technical       | browser-mockup, api-request, code-diff, annotated-image       | 4       |
| Presentation         | media-card, logo-wall, two-column-text, step-list             | 4       |
| **Total new**        |                                                               | **17**  |
| **Removed**          | section-title (replaced by chapter-card)                      | **-1**  |
| **Net change**       |                                                               | **+16** |
