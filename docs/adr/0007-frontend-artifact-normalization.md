# ADR 0007: Frontend Artifact Normalization for Deepagent Review

## Status

Accepted

## Date

2026-05-08

## Context

The web frontend receives LangGraph stream events and checkpoint interrupts from the deepagent pipeline. The existing UI showed active tools and a short partial LLM text, but important human-review material could arrive through different channels:

1. `interrupt()` checkpoint payloads such as `escaleta_checkpoint`, `direction_checkpoint`, `sound_chart_checkpoint`, and `audio_chart_checkpoint`.
2. Tool outputs such as `validate_config` and `audit_content_quality`, which return JSON reports.
3. Partial model messages, which are useful as visible operational activity during long runs.

Changing the backend protocol would require coordinated updates across the agent graph, tests, and possibly LangGraph runtime assumptions. The immediate product need is better visibility in the review frontend.

## Decision

Normalize reviewable artifacts in the frontend for now.

The web app extracts structured artifacts from existing stream/tool messages and renders them with dedicated cards:

- Validation reports from `errors`, `warnings`, and `recommendations`.
- Audio charts from `voiceover`, `sound_design`, or `soundDesign`.
- Script/escaleta-like payloads containing `scenes`.
- Fallback tool output cards for non-JSON or unknown payloads.

Checkpoint-specific cards remain the primary path for human approvals. Unknown checkpoints still render through the generic JSON card.

## Options Considered

### Option A: Frontend normalization over current stream contract

Use the current LangGraph SDK stream events and infer artifacts in `packages/web`.

Risks:

- Payload naming differences must be handled defensively in the UI.
- Some agent intent may remain unavailable if the backend never emits it.

### Option B: Add a new backend artifact event protocol

Make the deepagent emit explicit `artifact` events with stable schemas.

Risks:

- Larger blast radius across Python graph, prompts, tools, tests, and client.
- Requires migration and compatibility handling for current checkpoints.

### Option C: Keep generic JSON cards only

Avoid new normalization logic and expose raw checkpoint/tool output.

Risks:

- Poor human review experience.
- Validations, sound cards, and scripts remain difficult to inspect quickly.

## Consequences

### Positive

- Immediate UI improvement without changing the deepagent runtime.
- The human can inspect validation, audio, direction, and script data in the chat flow.
- Existing checkpoint approval/resume behavior remains unchanged.
- Unknown payloads still have a safe fallback.

### Negative

- The frontend now contains defensive payload normalization logic.
- A future backend artifact protocol may replace part of this client-side inference.

### Follow-Up

If the artifact set grows or multiple clients consume the agent, introduce an explicit backend `artifact` envelope and keep the frontend normalizers as backwards compatibility.
