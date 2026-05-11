# ADR 0006: Scene Catalog Narrative Templates

## Status

Accepted

## Date

2026-05-08

## Context

The agent pipeline already had many Remotion scene components, but the catalog exposed them mostly as a technical inventory. This made the copywriter choose scenes by component name instead of by narrative purpose. The result was valid configs, but not consistently strong videos.

The next quality bottleneck is not just more scenes. It is better scene selection: hook, problem, demo, proof, takeaway, summary, and CTA should be explicit choices before the agent writes JSON.

## Decision

Upgrade the generated scene catalog to include:

1. Narrative metadata for each built-in and custom scene:
   - `narrativeRoles`
   - `bestFor`
   - `avoidWhen`
   - `textLimits`
   - `durationRange`
   - `recommendedBeats`
   - `placement`
   - `exampleUse`
2. Reusable video templates:
   - `tutorial-code-walkthrough`
   - `tutorial-agent-pipeline`
   - `product-short-offer`
   - `product-short-problem-solution`
3. Query support in `query_scene_catalog` for both scenes and templates.
4. Optional `brief.templateId` and `brief.narrativeArc` fields in shared schemas.
5. Prompt and skill rules requiring the copywriter to choose a template before writing scenes.

## Options Considered

### Option A: Add more scene components first

This would increase visual variety, but would not solve weak structure or arbitrary sequencing.

### Option B: Keep templates only in prompts

This would be cheap, but templates would not be queryable or testable, and could drift from the runtime catalog.

### Option C: Generate narrative metadata and templates into `scene-catalog.json`

This keeps the agent-facing catalog close to the real scene registry and makes templates available through the same tool the copywriter already uses.

## Consequences

### Positive

- Copywriter can start from a proven narrative structure.
- Director and validator can preserve and audit the chosen story shape.
- Scene choice becomes explainable and testable.
- The catalog now helps agents avoid text-heavy or misplaced scenes.

### Negative

- `scripts/generate-scene-catalog.ts` now contains more editorial metadata.
- Templates may need tuning after reviewing real generated videos.

## References

- `scripts/generate-scene-catalog.ts`
- `src/shared/scene-catalog.json`
- `packages/agent/src/tools/catalog.py`
- `packages/agent/skills/scene-catalog/SKILL.md`
