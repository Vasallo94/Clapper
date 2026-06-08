# Streaming Frontend — Design Spec

> Date: 2026-04-23
> Status: Draft
> Author: Enrique Vasallo + Claude

## Problem

The Video Generator frontend uses blocking API calls (`client.runs.wait()`) that freeze the UI for minutes during agent execution. The user sees a static "Investigando..." spinner with no feedback about what the agent is doing. Additionally:

- Unknown checkpoint types cause empty/broken cards (direction_checkpoint rendered as empty escaleta)
- Errors produce a black screen instead of useful feedback
- The pipeline stepper advances manually via hardcoded calls, not from real agent events

## Solution

Replace blocking calls with LangGraph SDK streaming (`client.runs.stream()`) to show real-time agent activity inline in the chat. Each subagent gets a collapsible streaming bubble showing tools and LLM text.

## Design Decisions

| Decision             | Choice                                  | Rationale                                           |
| -------------------- | --------------------------------------- | --------------------------------------------------- |
| Detail level         | Stages + tools + LLM text               | Maximum visibility into what the agent is doing     |
| Streaming placement  | Inline in chat (not sidebar)            | Sidebar too narrow for tool/LLM detail              |
| Subagent transitions | Collapse completed, stack vertically    | Preserves history for backtracking                  |
| Unknown checkpoints  | Generic card with JSON + approve/reject | Never black screen                                  |
| Errors               | ErrorBanner inline in chat              | Already exists as component, just needs integration |

## Architecture

### Data Flow

```
LangGraph Server (:2024)
    |
    | POST /threads/{id}/runs/stream
    | streamMode: ["updates", "tools"]
    | streamSubgraphs: true
    v
useAgentStream hook
    |
    |-- parses "updates" events --> identifies active subagent, detects interrupts
    |-- parses "tools" events --> tracks tool calls (start/end/error)
    |-- parses "error" events --> surfaces errors
    |
    +---> StreamingBubble component (active subagent display)
    +---> usePipelineTracker (auto-advance stages)
    +---> App.tsx state (messages, checkpoints, errors)
```

### Stream Event Mapping

| Stream Event                   | Frontend Action                                       |
| ------------------------------ | ----------------------------------------------------- |
| `updates` with node name       | Set active subagent, advance pipeline stepper         |
| `updates` with `__interrupt__` | Extract checkpoint data, show appropriate card        |
| `tools` with `on_tool_start`   | Add tool to active list with "in progress" state      |
| `tools` with `on_tool_end`     | Mark tool as completed (green checkmark)              |
| `tools` with `on_tool_error`   | Mark tool as failed (red X)                           |
| `messages-tuple` with partial  | Append token to `llmText` for real-time LLM streaming |
| `error`                        | Show ErrorBanner with message and retry button        |
| Stream ends without interrupt  | Show final assistant message, advance to "done"       |

## Components

### New: `useAgentStream` hook

Location: `packages/web/src/hooks/useAgentStream.ts`

State managed:

```typescript
interface StreamState {
  activeAgent: string | null // "researcher", "copywriter", etc.
  tools: ToolEntry[] // { name, status: "running"|"done"|"error", startedAt }
  llmText: string // Streaming LLM text (if available from updates)
  completedAgents: AgentSummary[] // { name, toolCount, durationMs }
  error: string | null
}
```

Exposes:

- `startStream(threadId, input)` — starts a new run with streaming
- `resumeStream(threadId, decision)` — resumes from interrupt with streaming
- `streamState` — current stream state (reactive)
- `result` — final result when stream ends (ChatResponse or null)
- `isStreaming` — boolean

Implementation:

- Uses `client.runs.stream(threadId, "agent", { input, streamMode: ["updates", "tools", "messages-tuple"] })`
- Iterates with `for await (const event of stream)`
- On `updates` event: extracts node name from `event.data` keys, checks for `__interrupt__`
- On `tools` event: tracks tool lifecycle via `on_tool_start` / `on_tool_end` / `on_tool_error`
- On `messages-tuple` event: appends LLM token chunks to `llmText` for real-time text display
- On stream end: calls `client.threads.getState(threadId)` to extract final response
- Feeds `usePipelineTracker.advance()` automatically from stream events

### New: `StreamingBubble` component

Location: `packages/web/src/components/StreamingBubble.tsx`

Two visual states:

**Expanded (active subagent):**

```
┌─────────────────────────────────┐
│ ● researcher                     │
│ ├─ ✓ web_search "seguro motos"  │
│ ├─ ✓ scrape_product "seguro-m…" │
│ └─ ▶ web_search "TikTok hooks"  │
│                                  │
│ Las coberturas principales del   │
│ seguro de motos incluyen...█     │
└─────────────────────────────────┘
```

**Collapsed (completed subagent):**

```
┌─────────────────────────────────┐
│ ● researcher  3 tools · 12s  ▼  │
└─────────────────────────────────┘
```

Props:

```typescript
interface StreamingBubbleProps {
  agentName: string
  tools: ToolEntry[]
  llmText?: string
  status: "active" | "completed" | "error"
  durationMs?: number
  defaultExpanded?: boolean // true for active, false for completed
}
```

Styling:

- Active: border `#2a2a2a`, agent name in `#f59e0b` (warning/orange)
- Completed: border `#1e1e1e`, agent name in `#22c55e` (success/green)
- Error: border `rgba(239,68,68,0.3)`, agent name in `#ef4444`
- Tool checkmark: `#22c55e`, tool arrow: `#f59e0b`, tool X: `#ef4444`
- LLM text: `#666`, italic, cursor blink animation
- Collapse/expand: click anywhere on the header row

### New: `GenericCheckpointCard` component

Location: `packages/web/src/components/GenericCheckpointCard.tsx`

For checkpoint types the frontend doesn't have a specific card for. Shows:

- Checkpoint type as title (e.g. "audio_chart_checkpoint")
- JSON tree view of the interrupt value (collapsible)
- Approve / Request Changes buttons (same pattern as other cards)

### Existing: `ErrorBanner` component

Location: `packages/web/src/components/ErrorBanner.tsx` (already exists, unused)

Integration: render inline in `ChatThread` when `streamState.error` is set. Add a "Reintentar" button that resets the stream and retries the last action.

### Modified: `App.tsx`

Changes:

- Replace `sendMessage()` / `resumeCheckpoint()` await calls with `useAgentStream` hook
- `handleSend`: calls `stream.startStream(threadId, input)` instead of awaiting
- `handleApprove` / `handleRequestChanges` / etc.: call `stream.resumeStream(threadId, decision)`
- Render `StreamingBubble` components from `streamState.completedAgents` and active agent
- Render checkpoint cards when `stream.result?.type === "checkpoint"`
- Render `ErrorBanner` when `streamState.error` is set
- Remove hardcoded `pipeline.advance()` calls — the hook auto-advances

### Modified: `api.ts`

Changes:

- Remove `sendMessage()` and `resumeCheckpoint()` functions (replaced by hook)
- Keep `extractResponse()` as utility for parsing thread state after stream ends
- Export `client` instance for direct use by the hook
- Add thread creation helper

### Modified: `ChatThread.tsx`

Changes:

- Accept new props: `streamingBubbles`, `error`
- Render `StreamingBubble` components between messages
- Render `ErrorBanner` when error is present
- Handle new `checkpointType: "generic"` for `GenericCheckpointCard`

### Modified: `types.ts`

New types:

```typescript
interface ToolEntry {
  name: string
  input?: string // tool input summary (truncated)
  status: "running" | "done" | "error"
  startedAt: number
}

interface AgentSummary {
  name: string
  tools: ToolEntry[]
  durationMs: number
}

type CheckpointType = "escaleta" | "direction" | "sound_chart" | "generic"
```

### Modified: `usePipelineTracker.ts`

Changes:

- Add `advanceFromStream(agentName: string)` method that maps agent names to pipeline stages
- Mapping: researcher→"researcher", copywriter→"copywriter", director→"director", etc.
- Remove manual `pipeline.advance()` calls from App.tsx event handlers

## Files Summary

| File                                       | Action                                                   |
| ------------------------------------------ | -------------------------------------------------------- |
| `src/hooks/useAgentStream.ts`              | CREATE                                                   |
| `src/components/StreamingBubble.tsx`       | CREATE                                                   |
| `src/components/GenericCheckpointCard.tsx` | CREATE                                                   |
| `src/api.ts`                               | MODIFY — simplify to client + helpers                    |
| `src/App.tsx`                              | MODIFY — use streaming hook instead of await             |
| `src/components/ChatThread.tsx`            | MODIFY — render bubbles + errors                         |
| `src/components/ErrorBanner.tsx`           | EXISTING — integrate into ChatThread                     |
| `src/types.ts`                             | MODIFY — add ToolEntry, AgentSummary, generic checkpoint |
| `src/hooks/usePipelineTracker.ts`          | MODIFY — add stream-driven advancement                   |

## Verification

1. Start all 3 services: `npm run agent:dev`, render service, web dev
2. Send a message in http://localhost:5173
3. Verify: streaming bubbles appear showing researcher activity (tools + text)
4. Verify: researcher collapses when done, copywriter bubble appears
5. Verify: escaleta checkpoint card appears after copywriter finishes
6. Approve escaleta → verify direction checkpoint card appears
7. Approve direction → verify pipeline continues (sound/render)
8. Test error: kill the LangGraph server mid-run → verify ErrorBanner appears
9. Test unknown checkpoint: if audio_chart_checkpoint appears → verify GenericCheckpointCard renders
