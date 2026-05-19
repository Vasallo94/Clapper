# ADR 0009: Router and Mode Contracts over LangGraph

## Status

Accepted

## Date

2026-05-11

## Context

The current DeepAgents orchestrator is optimized for creating a new video from scratch. It can answer questions or apply modifications by prompt instruction, but the default workflow still nudges the model toward the full creative pipeline.

This is risky for follow-up requests such as "mejora el vídeo anterior", "renderiza otra vez", "qué mejorarías", or "haz una versión corta": without an explicit target and mode contract, the agent can duplicate work, start copywriting from scratch, or mutate a config when the user only asked for audit or render.

The project still benefits from LangGraph/DeepAgents for checkpoints, streaming, tool execution, virtual files, and subagent dispatch. The design problem is orchestration policy, not graph runtime.

## Decision

Add a deterministic intent router and mode contract layer before the creative pipeline policy.

The v1 mode set is:

- `new_video`
- `revise_existing`
- `render_only`
- `recover_failed_render`
- `audit_only`
- `variant`
- `asset_regeneration`
- `question`

Each mode defines target requirements, allowed agents, forbidden agents, write permission, render permission, checkpoints, and operating rules. The DeepAgents orchestrator remains the execution runtime, but its prompt and available tools now consume the router decision and contracts instead of relying on a single monolithic workflow.

The frontend persists selectable artifacts and sends the active target when available. If the target is missing for a mode that requires it, the backend lists known config candidates and asks the user to select one before proceeding.

## Options Considered

### Option A: Keep one prompt-driven pipeline

Risks:

- Follow-up requests can be interpreted as new video requests.
- Mode-specific prohibitions are implicit and easy for the model to violate.
- UI-selected artifacts cannot reliably constrain backend behavior.

### Option B: Replace DeepAgents with a manual LangGraph orchestrator

Risks:

- Larger migration with new streaming, checkpoint, tool, and subagent plumbing.
- Slower delivery for the immediate correctness problem.
- Higher chance of breaking the existing new-video path.

### Option C: Add router and contracts over DeepAgents

Risks:

- Some enforcement still depends on the model respecting prompt/tool outputs.
- A future version may need compiled subgraphs for stronger guarantees.

## Consequences

### Positive

- Follow-up requests can operate on explicit configs instead of restarting from scratch.
- Non-writing modes such as `audit_only` and `render_only` have clear guardrails.
- Existing checkpoints and subagents remain usable.
- The frontend/backend artifact handoff becomes part of the contract.

### Negative

- There is now another policy layer to test and maintain.
- Full subgraph-level enforcement is deferred.

### Follow-Up

Consider compiled LangGraph subgraphs per mode once the contract surface stabilizes. Candidate future modes are `director_pass`, `sound_pass`, `copy_pass`, `catalog`, `compare_versions`, `publish_package`, and `migration`.
