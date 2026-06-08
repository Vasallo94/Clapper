# ADR 0011: Use Official Linea Directa Brand Assets for Animated Lockups

## Status

Accepted

## Date

2026-05-12

## Context

The Linea Directa theme needs stronger brand presence in intros, shorts and presentation watermarks. The existing `PhoneMascot` was a simplified hand-drawn SVG approximation, which was animable but not visually close enough to the official logo.

The official source is available as a detailed SVG plus a PNG. The SVG is composed of many flat paths without semantic groups for phone, cable, wheels or wordmark, so internal part animation would require fragile manual path segmentation.

## Decision

Use official assets as the visual source of truth:

- `public/branding/linea-directa-logo.svg` for the full lockup.
- `public/branding/linea-directa-phone.png` for compact mascot placements.

Animate the asset containers in Remotion with frame-driven transforms, clipping masks, opacity, glints and subtle idle/ring motion. Do not redraw the official logo by hand for production scenes.

## Options Considered

### Option A: Continue with a hand-drawn SVG mascot

Risks:

- Lower brand fidelity.
- Expensive visual iteration.
- Easy to drift away from the official logo.

### Option B: Segment the official SVG into animable parts

Risks:

- The SVG has no stable semantic grouping.
- Future logo exports could break path-level assumptions.
- High implementation cost for limited visual gain.

### Option C: Animate official assets as complete visual layers

Risks:

- Internal phone details are not independently animable.
- Requires separate cropped asset for compact mascot use.

## Consequences

### Positive

- Brand fidelity improves immediately.
- Rendered scenes use the official visual language.
- Animations remain deterministic and frame-driven in Remotion.

### Negative

- Fine-grained animation of wheels, cable and keypad is intentionally avoided.
- The compact phone crop must be regenerated if the official source changes.
