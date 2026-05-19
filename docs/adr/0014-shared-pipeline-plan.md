# ADR 0014: Shared Pipeline Plan

## Status

Accepted

## Date

2026-05-18

## Context

The project uses DeepAgents, but the video pipeline had become tightly scripted in the orchestrator prompt. DeepAgents' built-in `write_todos` tool is useful for local planning, but it is not a reliable canonical coordination artifact for this system:

- subagents have isolated executions and need a shared view of the pipeline state;
- the UI and orchestrator already track domain-specific phases and checkpoints;
- generated artifacts live in `/pipeline/*`, but the execution plan itself was only implicit in prompt text;
- model-specific tool-call formatting issues can make generic todos noisy.

The pipeline needs an explicit, inspectable plan that belongs to the video workflow.

## Decision

Create `/pipeline/plan.json` as the canonical pipeline coordination artifact.

The plan records:

- schema version, goal, mode and optional target;
- ordered steps with `id`, `owner`, `status`, summaries, artifact paths and blockers;
- human decisions/checkpoints;
- append-only events for traceability;
- `currentStep` derived from the first in-progress step.

The orchestrator owns overall plan creation and final sequencing. Subagents may read the plan and update their own step through dedicated tools.

`write_todos` remains available as optional scratch planning, but it is not the source of truth for the video pipeline.

## Options Considered

### Option A: Keep all sequencing in the orchestrator prompt

Risks:

- Prompt grows brittle and hard to inspect.
- Subagents cannot see a structured shared plan.
- UI state and agent state drift apart.

### Option B: Use DeepAgents `write_todos` as the pipeline plan

Risks:

- Todos are generic and not domain-specific enough for checkpoints, artifacts and owners.
- Subagent visibility is ambiguous.
- Model formatting errors can break non-essential planning.

### Option C: Add a domain-specific shared plan artifact

Risks:

- Adds one more artifact to maintain.
- Requires agents to update status deliberately.

## Consequences

### Positive

- The pipeline has a domain-specific source of truth visible to orchestrator and subagents.
- Subagent tasks can refer to plan step IDs instead of embedding long procedural context.
- Human decisions and generated artifacts become traceable.
- Generic todos no longer compete with the real workflow state.

### Negative

- Prompts must be kept aligned with step IDs.
- The first implementation still relies on agents calling plan update tools consistently.
