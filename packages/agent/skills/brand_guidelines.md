# Brand Guidelines

Visual and editorial rules for Linea Directa video content.

## Visual identity

- **Primary color**: #CC3333 (Linea Directa red)
- **Secondary color**: #225050 (dark teal)
- **Background**: White (#FFFFFF)
- **Text**: #1A1A1A (near-black)
- **Font**: Arial, Helvetica, sans-serif (body), JetBrains Mono (code/terminal)

## Mascot (PhoneMascot)

- Button phone with 3x3 keypad, handset, cable, 4 wheels.
- Always visible in linea-directa theme (`mascot.show: true`).
- Corner watermark: scale 0.5, opacity 0.7, bottom-right.
- Animations: `"entry"` (intro scenes), `"idle"` (callout/outro), `"dial"` (terminal), `"ring"` (alerts).
- Use `darkBg` prop when placed on dark backgrounds (terminal scenes).

## Tone and language

- Default language: Spanish (Spain).
- Tone: professional but approachable. Avoid jargon.
- Address the audience as "tu" (informal).
- CTA style: direct and benefit-oriented ("Calcula tu precio", "Protege tu coche").

## Label

- linea-directa theme label: "Linea Directa · Claude Code"
- Label color matches primary (#CC3333).
- Accent line is solid #CC3333 (not gradient).

## Terminal scenes

- Dark terminal on radial gradient background.
- Claude label color: #C15F3C (warm orange).
- Command text: light gray (#e0e0e0), not green.
- Status bar: dark (#111111).

## Composition defaults

- Theme: always `"linea-directa"` unless user requests otherwise.
- Tutorials: 1280x720, 30fps.
- Product shorts: 1080x1920, 30fps.
- Transition: `"none"` by default. Use `"fade"` for premium feel.
