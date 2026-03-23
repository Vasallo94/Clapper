# Skill Escaleta Validation Design

## Problem

Video generation skills (`remotion-tutorial-generator`, `remotion-short-ld`) produce a `config.json` and render the video without user validation of the content. The user has no opportunity to review or adjust the script before the video is generated.

## Decision

Add an explicit escaleta validation step to all video generation skills, between the copywriting and config generation steps. The validation uses `AskUserQuestion` to present the full script and iterate until the user approves.

## Scope

- Applies to `remotion-tutorial-generator`, `remotion-short-ld`, and all future video skills.
- Documented as a project convention in `CLAUDE.md`.

## Design

### New step flow (both skills)

| Step | Name | Description |
|------|------|-------------|
| 1 | Research | Automatic parallel research (WebSearch, WebFetch, subagent). No user validation needed. |
| 2 | Copywriting | Generate content from research data (headlines, benefits, terminal lines, etc.). |
| **3** | **Escaleta validation** | **Present full script to user via `AskUserQuestion`. Iterate until approved.** |
| 4 | Generate config.json | Write validated content to `config.json`. |
| 5 | Render | Run `npx tsx scripts/render.ts`. |
| 6 | Summary | Report scenes, durations, output path. |

### Escaleta format

The escaleta is a text representation of the planned video, presented scene by scene:

```
## Script: [video title]

**Escena 1 — [type] ([duration]s)**
  [content specific to scene type]

**Escena 2 — [type] ([duration]s)**
  [content specific to scene type]

...

Duración total: ~[total]s
```

#### Content by scene type

**intro**: Title and subtitle.

**terminal**: List of lines with kind prefix (`> ` for command, `[output]` for output, `[claude]` for claude response, blank lines as separators).

**callout**: The callout text and position.

**outro**: Title and bullet list.

**hero** (ProductShort): Product name and headline.

**benefits** (ProductShort): Title and list of icon + text items.

**pricing** (ProductShort): Price, period, note, variant.

**cta** (ProductShort): CTA text, subtitle, URL.

### AskUserQuestion interaction

Present the escaleta with two options:
- **Aprobar**: Proceed to config.json generation.
- **Pedir cambios**: User provides feedback, Claude adjusts and re-presents.

The iteration loop has no limit. Claude continues adjusting and re-presenting until the user selects "Aprobar".

### CLAUDE.md addition

Add to the "Critical constraints" section:

> **Escaleta validation required.** All video generation skills must present a full escaleta (script) to the user via `AskUserQuestion` and obtain explicit approval before generating `config.json`. The iteration loop has no round limit. Research remains automatic.

### Files to modify

1. `.claude/skills/remotion-tutorial-generator/SKILL.md` — insert Paso 3 (Escaleta), renumber subsequent steps.
2. `.claude/skills/remotion-short-ld/SKILL.md` — insert Paso 3 (Escaleta), renumber subsequent steps.
3. `CLAUDE.md` — add escaleta validation rule to Critical constraints.

### What does NOT change

- Research step (automatic, no validation).
- Copywriting logic (still generates the same data).
- Config.json schema (unchanged).
- Render pipeline (unchanged).
- Scene types and composition architecture (unchanged).
