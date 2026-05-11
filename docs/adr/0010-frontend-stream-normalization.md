# ADR 0010: Normalize DeepAgents Stream Events in the Frontend

## Status

Accepted

## Date

2026-05-11

## Context

The current frontend consumes LangGraph stream events directly inside React state updates. It infers active agents and tools from partial `updates` payloads and calls completion callbacks inside `setState` updaters.

This causes duplicate UI cards during runs and makes the UI fragile as the backend now supports multiple orchestration modes, target checkpoints, and mode contracts.

The LangChain documentation recommends using subgraph streaming namespaces to route DeepAgents events and notes that newer SDK APIs expose typed projections for messages, tool calls, interrupts, and subagents. The installed SDK still supports the current `runs.stream` API, including `streamSubgraphs`.

## Decision

Introduce a frontend stream normalization layer.

The UI will normalize raw stream events into stable entities keyed by `tool_call_id`, namespace, source, and content signature. React components will render normalized state instead of raw event fragments.

For now, keep `client.runs.stream` to avoid a large migration, but enable `streamSubgraphs: true` and structure the code so a future migration to `client.threads.stream` or `@langchain/langgraph-sdk/react` is straightforward.

## Options Considered

### Option A: Keep patching component-level heuristics

Risks:

- Duplicates remain likely when events are replayed or emitted cumulatively.
- New mode cards would add more duplication paths.

### Option B: Migrate fully to SDK React `useStream`

Risks:

- Larger refactor across thread handling, checkpoint extraction, messages, and pipeline tracking.
- Harder to isolate the current duplication bug.

### Option C: Add a local normalization reducer first

Risks:

- Still uses the legacy stream API temporarily.
- Some event shapes remain defensive until the backend is migrated.

## Consequences

### Positive

- Duplicate cards can be fixed with deterministic state updates.
- Mode-specific artifacts and checkpoints have a clean input model.
- A future SDK migration has a clearer boundary.

### Negative

- The frontend owns more stream protocol code for now.
- The reducer must tolerate multiple event shapes from LangGraph SDK versions.
