# ADR 0008: Educational Video Duration Default

## Status

Accepted

## Date

2026-05-08

## Context

The deepagent copywriter generated a 35-second escaleta for a broad educational request: "qué es Claude Code". That duration is acceptable for a short teaser, but it is too compressed for the project goal of educational tutorials where the viewer should get a mental model, example, caveats, and recap.

The scene catalog templates also encoded short tutorial ranges (`35-75s` and `45-90s`), which made the short output look valid to the agent.

## Decision

Educational/tutorial videos default to `90-180` seconds unless the user explicitly asks for a short, ad, reel, or a specific shorter duration.

The copywriter prompt now states the default duration policy, the tutorial templates in `scene-catalog` use `90-180s`, and `audit_content_quality` warns when a non-ProductShort tutorial is below 90 seconds or has fewer than 8 scenes.

## Options Considered

### Option A: Keep short tutorial defaults

Risks:

- Broad educational topics remain superficial.
- The human must repeatedly ask for "más largo" after review.

### Option B: Default tutorials to 90-180 seconds

Risks:

- Renders take longer.
- Narrow single-tip videos may need explicit "short" wording.

### Option C: Ask the user for duration every time

Risks:

- Slows the automated pipeline.
- Violates the preferred default of making reasonable assumptions.

## Consequences

### Positive

- Educational outputs have enough room for explanation, demo, pitfalls, and recap.
- The quality audit catches accidentally short tutorials before render.
- Explicit shorts remain possible when requested.

### Negative

- More generated scenes and longer voiceover/audio passes increase runtime.
- Some simple topics may need the user to request a shorter format explicitly.
