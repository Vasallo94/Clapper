# ADR 0005: Agent Schema and Editorial Quality Guardrails

## Status

Accepted

## Date

2026-05-08

## Context

The DeepAgents pipeline generated video configs from prompts and skills, but the automatic checks before rendering were incomplete:

1. The Python `validate_config` tool checked assets and custom scene registration, but not the same Zod schemas used by Remotion and the render service.
2. Editorial quality issues such as weak hooks, over-dense visible copy, missing CTA, missing beats, or voiceover that is too fast were only handled by prompt instructions.
3. The `scene_creator` subgraph existed and was documented in the orchestrator prompt, but it was not registered in the actual orchestrator subagent list.
4. Some tools imported fixed path constants, making tests and runtime overrides harder to keep aligned.

The official Remotion AI guidance favors reusable agent skills, structured generated outputs, schema validation, and automatic compilation/repair loops for generated Remotion code.

## Decision

Add deterministic guardrails to the DeepAgents pipeline:

1. `validate_config` now runs `scripts/validate-config.ts` when available, so the Python agent tool uses the same Remotion Zod schemas as the render service.
2. Add `audit_content_quality(config)` as a direct tool and as part of `validate_config`. It returns `errors`, `warnings`, and `recommendations` for editorial quality and synchronization risks.
3. Register `scene_creator` in the actual orchestrator subagent list so missing custom components can enter the lint/register/bundle validation loop.
4. Update prompts for orchestrator, copywriter, director, validator, and scene creator so agents self-audit before human checkpoints and pass JSON strings to validation tools.
5. Normalize `sound.py` and `voice.py` path handling around a patchable `PROJECT_ROOT`, matching the rest of the agent tooling.

## Options Considered

### Option A: Prompt-only quality improvements

Improve only the system prompts and skills.

Risks:

- Prompt instructions are easy for models to skip under long context.
- Schema errors would still be discovered late by the render service.
- No deterministic signal for tests or automated repair.

### Option B: Validate only in the render service

Rely on `/api/render` to reject invalid configs.

Risks:

- Agents get feedback too late, after production steps may already have generated audio assets.
- Render failures are harder to attribute to the responsible subagent.
- Editorial issues remain invisible to automation.

### Option C: Shared schema and editorial guardrails in agent tools

Run Remotion schema validation and content-quality heuristics inside the agent validation step.

Risks:

- Heuristics can over-warn on deliberate creative choices.
- Running `npx tsx` from Python adds a Node dependency to validation environments.

Mitigations:

- Editorial output separates blocking `errors` from non-blocking `warnings` and `recommendations`.
- Schema validation is skipped with a warning if the local validation script is unavailable.

## Consequences

### Positive

- Agents receive actionable validation before render.
- The copywriter/director can self-repair configs before asking for human approval.
- Custom scene generation is no longer a documented-but-disconnected path.
- The validation layer now matches the render service schema instead of approximating it.

### Negative

- Validation has a little more latency when the Zod script runs.
- The content audit is heuristic and may need tuning as more generated videos are reviewed.

## References

- `packages/agent/src/tools/validation.py`
- `packages/agent/src/orchestrator.py`
- `packages/agent/prompts/*.md`
- `scripts/validate-config.ts`
