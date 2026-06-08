# ADR 0012: Conversational DeepAgent Interactions

## Status

Accepted

## Date

2026-05-13

## Context

The DeepAgent pipeline already supports rich human checkpoints for escaleta approval, direction, audio charts, target selection, revision plans, variants, validation and review.

Those checkpoints work well for complex artifacts, but they are too heavy for lightweight conversational needs: onboarding a new user, clarifying an ambiguous request, asking a small creative preference, or letting the agent explain why it selected a mode.

The project principle remains: automate execution, not judgment. The system should ask for human input when the answer changes a meaningful creative decision, while avoiding unnecessary questions about technical execution.

## Decision

Introduce a generic `interaction_request` protocol on top of LangGraph `interrupt()`.

The backend exposes one conversational tool that emits structured interaction payloads. The frontend renders those payloads by input kind:

- `text`
- `single_choice`
- `multi_choice`
- `approval`

Existing rich checkpoint cards remain dedicated components. They can be migrated later if useful, but the first implementation keeps them stable to reduce risk.

## Options Considered

### Option A: Add more dedicated checkpoint card types

Risks:

- Every new lightweight question requires backend and frontend branching.
- The UI becomes coupled to one-off creative interactions.
- Onboarding and clarification flows remain awkward.

### Option B: Use only plain assistant messages

Risks:

- The agent cannot pause and resume with structured responses.
- Choices and checkboxes are lost as machine-readable data.
- The workflow relies on fragile natural-language parsing.

### Option C: Add a generic interaction protocol

Risks:

- Adds another protocol layer alongside existing checkpoints.
- Requires prompt rules to avoid excessive questioning.

## Consequences

### Positive

- The DeepAgent can guide new users and ask lightweight creative questions.
- The frontend gets one reusable renderer for common input patterns.
- The backend can evolve interaction formats without creating one tool per UI card.
- Existing artifact approval cards remain unchanged.

### Negative

- The orchestrator prompt now owns a clearer policy for when to ask vs continue.
- The frontend must handle both legacy checkpoint types and generic interactions.
