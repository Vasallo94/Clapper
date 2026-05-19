---
name: brand-guidelines
description: Identidad visual y editorial de Linea Directa para generacion de videos. Colores, mascota PhoneMascot, tono de marca, tipografia y defaults de composicion. Usala al generar escaletas, escribir copy o tomar decisiones creativas.
---

# Brand Guidelines — Linea Directa

Visual and editorial identity for all Linea Directa video content.

## Visual identity

| Token          | Value                        | Usage                               |
| -------------- | ---------------------------- | ----------------------------------- |
| Primary        | #CC3333                      | Accent line, labels, CTA highlights |
| Secondary      | #225050                      | Supporting elements, dark teal      |
| Background     | #FFFFFF                      | Scene backgrounds                   |
| Foreground     | #1A1A1A                      | Body text                           |
| Foreground mid | #888888                      | Secondary text                      |
| Font (body)    | Arial, Helvetica, sans-serif | All non-code text                   |
| Font (mono)    | JetBrains Mono               | Terminal scenes, code blocks        |

## PhoneMascot

The mascot is a button phone with 3x3 keypad, handset, cable, and 4 wheels — faithful to the real Linea Directa logo.

- Always visible in linea-directa theme (`mascot.show: true`)
- Corner watermark: scale 0.5, opacity 0.7, bottom-right
- Animations by scene context:
  - `"entry"` — intro scenes (roll-in + handset lift + idle)
  - `"idle"` — callout, outro (gentle breathing)
  - `"dial"` — terminal scenes (keypad interaction)
  - `"ring"` — alerts, attention moments
- Use `darkBg` prop on dark backgrounds (terminal scenes)

## Tone and language

- Default language: Spanish (Spain)
- Tone: professional but approachable — no jargon
- Address audience as "tu" (informal)
- CTA style: direct and benefit-oriented ("Calcula tu precio", "Protege tu coche")
- Write like a creative director, not a feature list — every word earns its place

## Copy density limits

| Element      | Max words |
| ------------ | --------- |
| Hero title   | 8         |
| Benefit item | 12        |
| CTA text     | 5         |
| Callout text | 20        |
| Pricing note | 8         |

## Terminal scenes (linea-directa theme)

- Dark terminal on radial gradient background
- Claude label color: #C15F3C (warm orange, not blue)
- Command text: light gray #e0e0e0 (not green)
- Status bar: dark #111111

## Composition defaults

- Theme: always `"linea-directa"` unless user requests otherwise
- Tutorials: 1280x720, 30fps
- Product shorts: 1080x1920, 30fps
- Transition: `"none"` by default; use `"fade"` for premium feel
- Label: "Linea Directa · Claude Code"
- Accent line: solid #CC3333 (not gradient)

## Emotional arc

Every video follows a tension-release structure:

1. **Hook** (hero/intro) — provocation or bold claim, max 8 words, create curiosity
2. **Problem/tension** (callout/custom) — name the pain, be specific
3. **Solution/release** (benefits/terminal) — show the answer, proof over promises
4. **Social proof/pricing** (pricing/benefits) — reinforce with numbers
5. **CTA close** (cta) — one clear action, max 5 words

## Scene flow rules

- **NEVER repeat the same scene type consecutively** — e.g. two `hero` or two `callout` in a row is forbidden. Use the full variety of available types.
- Alternate energy: high (hero, pricing) then low (benefits, callout)
- Lead with surprise — first scene breaks expectations
- Shorts: 3-6 scenes, 4 is the sweet spot
- Tutorials: 60-180s total; shorts: 15-30s total
