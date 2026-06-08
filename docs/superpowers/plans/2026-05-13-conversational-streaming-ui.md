# Conversational Streaming UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual streaming parser with the SDK's native `useStream` hook so coordinator messages render as first-class chat bubbles and subagent work appears as collapsible detail cards beneath them.

**Architecture:** The SDK's `useStream` from `@langchain/langgraph-sdk/react` handles all streaming, threading, message parsing, subagent lifecycle, and interrupt detection internally. We build a thin `useVideoStream` wrapper that adds pipeline tracking and video-result enrichment. `ChatThread` renders SDK messages directly — human messages as user bubbles, AI messages as assistant bubbles with linked `SubagentCard` accordions underneath. Checkpoints render from `stream.interrupt` at the bottom of the message list.

**Tech Stack:** `@langchain/langgraph-sdk@1.9.1` (already installed, `./react` export), React 18, TypeScript

---

## File Map

| Action     | Path                                                | Responsibility                                                                                            |
| ---------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Create** | `packages/web/src/hooks/useVideoStream.ts`          | Wrapper around SDK `useStream` — adds pipeline tracking, video-result enrichment, target metadata         |
| **Create** | `packages/web/src/components/SubagentCard.tsx`      | Collapsible card for a single `SubagentStreamInterface` — name, status, duration, tools, thinking         |
| **Modify** | `packages/web/src/types.ts`                         | Remove `AgentSummary`, `AgentArtifact`, `AgentArtifactKind`, `MessageRole="agent"`; add `Enrichment` type |
| **Modify** | `packages/web/src/components/ChatThread.tsx`        | Two-layer rendering: SDK messages as `MessageBubble` + subagent cards via `getSubagentsByMessage`         |
| **Modify** | `packages/web/src/App.tsx`                          | Use `useVideoStream`; simplified thread management; checkpoint handling from `stream.interrupt`           |
| **Modify** | `packages/web/src/api.ts`                           | Remove `extractResponse` and `createThread` (SDK handles both)                                            |
| **Delete** | `packages/web/src/hooks/useAgentStream.ts`          | Replaced by `useVideoStream`                                                                              |
| **Delete** | `packages/web/src/lib/streamEvents.ts`              | SDK handles all event parsing                                                                             |
| **Delete** | `packages/web/src/lib/streamEvents.test.ts`         | Tests for deleted module                                                                                  |
| **Delete** | `packages/web/src/lib/artifacts.ts`                 | Only consumer was `streamEvents.ts`                                                                       |
| **Delete** | `packages/web/src/components/StreamingBubble.tsx`   | Replaced by `SubagentCard`                                                                                |
| **Delete** | `packages/web/src/components/AgentArtifactCard.tsx` | Only consumer was `StreamingBubble`                                                                       |

---

## SDK API Reference (already installed at `@langchain/langgraph-sdk@1.9.1`)

```ts
import { useStream } from "@langchain/langgraph-sdk/react"

const stream = useStream({
  apiUrl: "http://127.0.0.1:2024",
  assistantId: "agent",
  threadId: threadId ?? null,        // null → SDK creates thread on first submit
  onThreadId: (id) => { ... },       // fires when thread is created
  filterSubagentMessages: true,      // stream.messages = coordinator only
  onFinish: (state) => { ... },      // fires when stream completes
  onError: (err) => { ... },
})

// Key properties:
stream.messages    // Message[] — coordinator messages only (human + AI)
stream.isLoading   // boolean
stream.error       // unknown
stream.interrupt   // Interrupt | undefined — checkpoint data
stream.subagents   // Map<string, SubagentStreamInterface>
stream.activeSubagents // SubagentStreamInterface[] — currently running

// Key methods:
stream.submit(values, options)                // send message or resume
stream.getSubagentsByMessage(aiMessageId)     // link subagents to AI message
stream.switchThread(newThreadId | null)       // change thread

// SubagentStreamInterface:
{
  id: string,
  status: "pending" | "running" | "complete" | "error",
  toolCall: { args: { description?: string, subagent_type?: string } },
  messages: Message[],           // subagent's internal messages
  toolCalls: ToolCallWithResult[], // subagent's tool calls
  result: string | null,        // final output when complete
  startedAt: Date | null,
  completedAt: Date | null,
}
```

---

## Task 1: Update `types.ts` — remove old types, add Enrichment

**Files:**

- Modify: `packages/web/src/types.ts`

- [ ] **Step 1: Remove old agent types and add Enrichment**

Remove `AgentSummary`, `AgentArtifact`, `AgentArtifactKind`, and the `"agent"` MessageRole. Add `Enrichment` type for local cards (video results, system messages). Keep `ToolEntry` temporarily — `SubagentCard` will use the SDK's `ToolCallWithResult` instead but the type may still be used elsewhere.

```ts
// REMOVE these types:
// - AgentSummary
// - AgentArtifact
// - AgentArtifactKind

// CHANGE MessageRole:
export type MessageRole = "user" | "assistant"

// CHANGE ChatMessage — remove agentSummary:
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  checkpoint?:
    | CheckpointData
    | SoundChartData
    | AudioChartData
    | DirectionData
    | ValidationReportData
    | InteractionRequestData
    | TargetSelectionData
    | RevisionPlanData
    | VariantPlanData
    | Record<string, unknown>
  checkpointType?: CheckpointType
}

// ADD this new type:
export interface Enrichment {
  id: string
  type: "video_result" | "system"
  content: string
  data?: Record<string, unknown>
}
```

- [ ] **Step 2: Verify TypeScript compiles with the new types**

Run: `cd packages/web && npx tsc --noEmit 2>&1 | head -30`

Expected: Errors in files we haven't migrated yet (`App.tsx`, `ChatThread.tsx`, `useAgentStream.ts`, etc.). That's OK — we'll fix them in subsequent tasks. What matters is `types.ts` itself is consistent.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/types.ts
git commit -m "refactor(web): remove AgentSummary types, add Enrichment type for conversational UI"
```

---

## Task 2: Create `SubagentCard.tsx`

**Files:**

- Create: `packages/web/src/components/SubagentCard.tsx`

This replaces `StreamingBubble.tsx`. It takes a `SubagentStreamInterface` directly from the SDK instead of our custom `AgentSummary`. Auto-collapses when the subagent completes.

- [ ] **Step 1: Create SubagentCard component**

```tsx
import React, { useState, useEffect } from "react"
import type { SubagentStreamInterface } from "@langchain/langgraph-sdk/react"
import { theme } from "../theme"
import { SubagentBadge } from "./SubagentBadge"
import { ClapperboardIcon } from "./WorkingIndicator"

interface Props {
  subagent: SubagentStreamInterface
  defaultExpanded?: boolean
}

const STATUS_COLORS = {
  pending: { dot: "#888", border: theme.colors.border.subtle, name: theme.colors.text.muted },
  running: { dot: "#f59e0b", border: theme.colors.border.default, name: "#f59e0b" },
  complete: { dot: "#22c55e", border: theme.colors.border.subtle, name: "#22c55e" },
  error: { dot: "#ef4444", border: "rgba(239,68,68,0.3)", name: "#ef4444" },
}

function formatDuration(start: Date | null, end: Date | null): string | null {
  if (!start) return null
  const ms = (end ?? new Date()).getTime() - start.getTime()
  return `${(ms / 1000).toFixed(0)}s`
}

function getSubagentLabel(subagent: SubagentStreamInterface): string {
  return subagent.toolCall.args.subagent_type ?? subagent.toolCall.name ?? "subagent"
}

function getThinkingText(subagent: SubagentStreamInterface): string {
  const aiMessages = subagent.messages.filter((m) => "type" in m && (m as { type: string }).type === "ai")
  const last = aiMessages[aiMessages.length - 1]
  if (!last) return ""
  const content = (last as { content: unknown }).content
  return typeof content === "string" ? content : ""
}

export function SubagentCard({ subagent, defaultExpanded }: Props) {
  const name = getSubagentLabel(subagent)
  const colors = STATUS_COLORS[subagent.status]
  const duration = formatDuration(subagent.startedAt, subagent.completedAt)
  const toolsDone = subagent.toolCalls.filter((tc) => tc.result !== undefined).length
  const thinking = getThinkingText(subagent)

  const [expanded, setExpanded] = useState(defaultExpanded ?? subagent.status !== "complete")

  useEffect(() => {
    if (subagent.status === "complete") setExpanded(false)
  }, [subagent.status])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setExpanded((prev) => !prev)
    }
  }

  if (!expanded) {
    return (
      <div
        className="animate-slide-in"
        role="button"
        tabIndex={0}
        aria-expanded={false}
        aria-label={`Expandir detalles de ${name}`}
        onClick={() => setExpanded(true)}
        onKeyDown={handleKeyDown}
        style={{
          background: theme.colors.bg.elevated,
          padding: "8px 12px",
          borderRadius: theme.radius.md,
          border: `1px solid ${colors.border}`,
          marginBottom: 6,
          marginLeft: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: colors.dot }} />
          <span style={{ color: colors.name, fontSize: 12, fontWeight: 600, fontFamily: theme.fonts.mono }}>
            {name}
          </span>
          <span style={{ color: theme.colors.text.muted, fontSize: 11 }}>
            {toolsDone} tools{duration ? ` · ${duration}` : ""}
          </span>
        </div>
        <span style={{ color: theme.colors.text.muted, fontSize: 10 }}>&#9660;</span>
      </div>
    )
  }

  return (
    <div
      className="animate-card-reveal"
      style={{
        background: theme.colors.bg.elevated,
        padding: "10px 12px",
        borderRadius: theme.radius.md,
        border: `1px solid ${colors.border}`,
        marginBottom: 6,
        marginLeft: 16,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={true}
        aria-label={`Colapsar detalles de ${name}`}
        onClick={() => setExpanded(false)}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: subagent.toolCalls.length > 0 || thinking ? 8 : 0,
          cursor: "pointer",
        }}
      >
        <div
          className={subagent.status === "running" ? "animate-pulse" : undefined}
          style={{ width: 6, height: 6, borderRadius: "50%", background: colors.dot, flexShrink: 0 }}
        />
        <span style={{ color: colors.name, fontSize: 12, fontWeight: 600, fontFamily: theme.fonts.mono }}>{name}</span>
        {subagent.status === "running" && <SubagentBadge agentName={name} />}
        {subagent.status === "running" && (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <ClapperboardIcon size={20} />
          </span>
        )}
        {subagent.status !== "running" && (
          <span style={{ color: theme.colors.text.muted, fontSize: 10, marginLeft: "auto" }}>&#9650;</span>
        )}
      </div>

      {subagent.toolCalls.length > 0 && (
        <div
          style={{
            borderLeft: `2px solid ${theme.colors.border.default}`,
            paddingLeft: 10,
            marginBottom: thinking ? 8 : 0,
          }}
        >
          {subagent.toolCalls.map((tc) => {
            const isDone = tc.result !== undefined
            const isError = isDone && typeof tc.result === "string" && /^[Ee]rror\b/.test(tc.result.trim())
            return (
              <div
                key={tc.call.id}
                style={{ fontSize: 11, marginBottom: 2, fontFamily: theme.fonts.mono, display: "flex", gap: 6 }}
              >
                <span
                  style={{
                    color: isDone ? (isError ? "#ef4444" : "#22c55e") : "#f59e0b",
                    flexShrink: 0,
                  }}
                >
                  {isDone ? (isError ? "✗" : "✓") : "▶"}
                </span>
                <span style={{ color: theme.colors.text.secondary }}>
                  {tc.call.name}
                  {tc.call.args && (
                    <span style={{ color: theme.colors.text.muted }}>
                      {" "}
                      {typeof tc.call.args === "string"
                        ? tc.call.args.slice(0, 120)
                        : JSON.stringify(tc.call.args).slice(0, 120)}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {thinking && (
        <div
          style={{
            border: `1px solid ${theme.colors.border.subtle}`,
            borderRadius: theme.radius.sm,
            padding: "8px 10px",
            backgroundColor: theme.colors.bg.primary,
            fontSize: 12,
            color: theme.colors.text.secondary,
            lineHeight: 1.5,
            maxHeight: 150,
            overflow: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          <div
            style={{
              color: theme.colors.text.muted,
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Pensamiento operativo
          </div>
          {thinking}
          {subagent.status === "running" && <span className="loading-dot" style={{ marginLeft: 2 }} />}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd packages/web && npx tsc --noEmit 2>&1 | grep SubagentCard`

Expected: No errors from `SubagentCard.tsx`. If `SubagentStreamInterface` import fails, adjust to use the correct import path from the SDK's type exports.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/SubagentCard.tsx
git commit -m "feat(web): add SubagentCard — collapsible card for SDK SubagentStreamInterface"
```

---

## Task 3: Create `useVideoStream.ts` — main hook

**Files:**

- Create: `packages/web/src/hooks/useVideoStream.ts`

This is the core of the refactor. It wraps the SDK's `useStream` and adds:

- Pipeline stage tracking (from active subagents)
- Target metadata injection (appending `ACTIVE_VIDEO_TARGET:` to messages)
- Checkpoint type extraction (from `stream.interrupt`)
- Video result enrichment (from `onFinish`)
- Resume support (for checkpoint approval/rejection)

**Critical design decisions:**

1. `stream.messages` is the source of truth for chat messages — no local `ChatMessage[]` duplication
2. `stream.interrupt` drives checkpoint rendering — no `extractResponse` polling
3. Thread management delegates to SDK (`threadId` + `onThreadId`)
4. Pipeline tracking derived from `stream.activeSubagents`

- [ ] **Step 1: Create the hook**

```ts
import { useCallback, useEffect, useRef, useState } from "react"
import { useStream, type SubagentStreamInterface } from "@langchain/langgraph-sdk/react"
import type { ActiveVideoTarget, CheckpointType, Enrichment } from "../types"
import { appendTargetMetadata, stripTargetMetadata } from "../lib/targetMetadata"
import type { PipelineMode } from "./usePipelineTracker"

const API_URL = import.meta.env.VITE_LANGGRAPH_URL ?? "http://127.0.0.1:2024"
const ASSISTANT_ID = "agent"

const CHECKPOINT_TYPE_MAP: Record<string, CheckpointType> = {
  sound_chart_checkpoint: "sound_chart",
  audio_chart_checkpoint: "audio_chart",
  direction_checkpoint: "direction",
  escaleta_checkpoint: "escaleta",
  interaction_request: "interaction",
  validation_report: "validation",
  target_selection_checkpoint: "target_selection",
  revision_plan_checkpoint: "revision_plan",
  variant_plan_checkpoint: "variant_plan",
}

const AGENT_TO_STAGE: Record<string, string> = {
  researcher: "researcher",
  copywriter: "copywriter",
  director: "director",
  audio_planner: "sound_engineer",
  voice_generator: "sound_engineer",
  sound_engineer: "sound_engineer",
  scene_creator: "scene_creator",
  validator: "validator",
  reviewer: "rendering",
}

export interface CheckpointInfo {
  type: CheckpointType
  data: Record<string, unknown>
}

export interface VideoStreamCallbacks {
  onPipelineAdvance?: (stage: string, message: string) => void
  onPipelineMode?: (mode: PipelineMode) => void
  onThreadCreated?: (threadId: string) => void
  onVideoResult?: (enrichment: Enrichment) => void
}

export function useVideoStream(callbacks?: VideoStreamCallbacks) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [enrichments, setEnrichments] = useState<Enrichment[]>([])
  const activeTargetRef = useRef<ActiveVideoTarget | null>(null)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks
  const lastSubagentTypesRef = useRef<Set<string>>(new Set())

  const stream = useStream({
    apiUrl: API_URL,
    assistantId: ASSISTANT_ID,
    threadId,
    filterSubagentMessages: true,
    onThreadId: (id: string) => {
      setThreadId(id)
      callbacksRef.current?.onThreadCreated?.(id)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      callbacksRef.current?.onPipelineAdvance?.("error", msg)
    },
    onFinish: () => {
      if (!stream.interrupt) {
        callbacksRef.current?.onPipelineAdvance?.("done", "Pipeline completado")
      }
    },
  } as Record<string, unknown>)

  // Track pipeline stage from active subagents
  useEffect(() => {
    const currentTypes = new Set<string>()
    for (const sub of stream.activeSubagents) {
      const type = sub.toolCall.args.subagent_type
      if (type) {
        currentTypes.add(type)
        if (!lastSubagentTypesRef.current.has(type)) {
          const stage = AGENT_TO_STAGE[type]
          if (stage) {
            callbacksRef.current?.onPipelineAdvance?.(stage, `${type} trabajando...`)
          }
        }
      }
    }
    lastSubagentTypesRef.current = currentTypes
  }, [stream.activeSubagents])

  // Detect pipeline mode from intent_decision tool calls
  useEffect(() => {
    for (const [, sub] of stream.subagents) {
      if (sub.status !== "complete") continue
      if (sub.result) {
        try {
          const parsed = JSON.parse(sub.result)
          if (parsed?.mode) {
            callbacksRef.current?.onPipelineMode?.(parsed.mode as PipelineMode)
          }
        } catch {
          // not JSON, skip
        }
      }
    }
  }, [stream.subagents])

  // Extract checkpoint info from interrupt
  const checkpoint: CheckpointInfo | null = (() => {
    if (!stream.interrupt) return null
    const value = stream.interrupt.value as Record<string, unknown> | null
    if (!value || typeof value !== "object") return null
    const cpType = value.type as string
    const mapped = CHECKPOINT_TYPE_MAP[cpType]
    if (!mapped) {
      return { type: "generic" as CheckpointType, data: value }
    }
    return { type: mapped, data: value }
  })()

  // Advance pipeline on checkpoint
  useEffect(() => {
    if (!checkpoint) return
    const stageMap: Record<string, [string, string]> = {
      escaleta: ["escaleta_review", "Escaleta generada"],
      direction: ["director", "Direccion editorial lista"],
      sound_chart: ["sound_review", "Carta de sonido generada"],
      audio_chart: ["sound_review", "Carta de audio generada"],
      interaction: ["orchestrator", "Respuesta del usuario requerida"],
      validation: ["validator", "Validacion generada"],
      target_selection: ["orchestrator", "Seleccion de target requerida"],
      revision_plan: ["escaleta_review", "Plan de revision preparado"],
      variant_plan: ["escaleta_review", "Plan de variante preparado"],
    }
    const mapped = stageMap[checkpoint.type]
    if (mapped) {
      callbacksRef.current?.onPipelineAdvance?.(mapped[0], mapped[1])
    }
  }, [checkpoint])

  const submit = useCallback(
    (text: string, target?: ActiveVideoTarget | null) => {
      activeTargetRef.current = target ?? null
      setEnrichments([])
      const content = appendTargetMetadata(text, target)
      callbacksRef.current?.onPipelineAdvance?.("orchestrator", "Mensaje recibido: " + text.slice(0, 60))
      stream.submit({ messages: [{ type: "human", content }] }, { streamSubgraphs: true })
    },
    [stream],
  )

  const resume = useCallback(
    (decision: Record<string, unknown>) => {
      stream.submit(null, {
        command: { resume: decision },
        streamSubgraphs: true,
      })
    },
    [stream],
  )

  const switchThread = useCallback((newThreadId: string | null) => {
    setThreadId(newThreadId)
    setEnrichments([])
    lastSubagentTypesRef.current.clear()
  }, [])

  const addEnrichment = useCallback((enrichment: Enrichment) => {
    setEnrichments((prev) => [...prev, enrichment])
  }, [])

  return {
    // SDK pass-through
    messages: stream.messages,
    isLoading: stream.isLoading,
    error: stream.error,
    subagents: stream.subagents,
    activeSubagents: stream.activeSubagents,
    getSubagentsByMessage: stream.getSubagentsByMessage,

    // Our additions
    threadId,
    checkpoint,
    enrichments,
    submit,
    resume,
    switchThread,
    addEnrichment,
    activeTarget: activeTargetRef.current,

    // Utility
    stripTargetMetadata,
  }
}

export type VideoStream = ReturnType<typeof useVideoStream>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit 2>&1 | grep useVideoStream`

Expected: No errors from `useVideoStream.ts` itself. The `as Record<string, unknown>` cast on the `useStream` options handles the `filterSubagentMessages` being on the internal type.

**Note on the cast:** `filterSubagentMessages` is part of `AnyStreamOptions` (internal type) but accepted by `useStream` at runtime. The cast is the pragmatic workaround. If the SDK's public types are updated to expose it, remove the cast.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useVideoStream.ts
git commit -m "feat(web): add useVideoStream hook wrapping SDK useStream with pipeline tracking"
```

---

## Task 4: Update `ChatThread.tsx` — new rendering model

**Files:**

- Modify: `packages/web/src/components/ChatThread.tsx`

The rendering model changes from "everything is a ChatMessage" to "SDK messages + checkpoint + subagent cards":

1. **SDK human messages** → user `MessageBubble` (right-aligned, red)
2. **SDK AI messages with content** → assistant `MessageBubble` (left-aligned, dark) + linked `SubagentCard`s underneath
3. **SDK AI messages without content** (just tool_calls) → only render linked `SubagentCard`s
4. **Checkpoint** → checkpoint card at the bottom (from `stream.interrupt`)
5. **Enrichments** (video results) → after all messages
6. **Active subagents** → at the bottom while streaming, if not yet linked to a message

- [ ] **Step 1: Rewrite ChatThread**

```tsx
import React, { useEffect, useRef, useMemo } from "react"
import type { Message } from "@langchain/langgraph-sdk"
import type { SubagentStreamInterface } from "@langchain/langgraph-sdk/react"
import type {
  AudioChartData,
  CheckpointType,
  DirectionData,
  Enrichment,
  InteractionRequestData,
  PipelineStageId,
  RevisionPlanData,
  SoundChartData,
  TargetSelectionData,
  ValidationReportData,
  VariantPlanData,
} from "../types"
import type { CheckpointInfo } from "../hooks/useVideoStream"
import { CheckpointCard } from "./CheckpointCard"
import { DirectionCard } from "./DirectionCard"
import { GenericCheckpointCard } from "./GenericCheckpointCard"
import { InteractionRequestCard } from "./InteractionRequestCard"
import { SoundChartCard } from "./SoundChartCard"
import { SubagentCard } from "./SubagentCard"
import { ErrorBanner } from "./ErrorBanner"
import { MessageBubble } from "./MessageBubble"
import { VideoResultCard } from "./VideoResultCard"
import { RenderProgress } from "./RenderProgress"
import { ValidationReportCard } from "./ValidationReportCard"
import { TargetSelectionCard } from "./TargetSelectionCard"
import { RevisionPlanCard } from "./RevisionPlanCard"
import { VariantPlanCard } from "./VariantPlanCard"
import { WorkingIndicator } from "./WorkingIndicator"
import { theme } from "../theme"
import { stripTargetMetadata } from "../lib/targetMetadata"

interface Props {
  messages: Message[]
  getSubagentsByMessage: (msgId: string) => SubagentStreamInterface[]
  activeSubagents: SubagentStreamInterface[]
  checkpoint: CheckpointInfo | null
  checkpointHandlers: Record<
    string,
    { onApprove: (payload?: Record<string, unknown>) => void; onRequestChanges: (feedback: string) => void }
  >
  enrichments: Enrichment[]
  isLoading: boolean
  loadingLabel: string
  error: unknown
  onRetry?: () => void
  currentStage?: PipelineStageId
}

function getMessageContent(msg: Message): string {
  if (typeof msg.content === "string") return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter(
        (c): c is { type: "text"; text: string } =>
          typeof c === "object" && c !== null && "type" in c && c.type === "text",
      )
      .map((c) => c.text)
      .join("")
  }
  return ""
}

function renderCheckpointCard(
  checkpoint: CheckpointInfo,
  handlers: Props["checkpointHandlers"],
  disabled: boolean,
): React.ReactNode {
  const h = handlers[checkpoint.type]
  if (!h) return null

  const cardProps = {
    onApprove: h.onApprove,
    onRequestChanges: h.onRequestChanges,
    disabled,
  }

  switch (checkpoint.type) {
    case "interaction":
      return <InteractionRequestCard data={checkpoint.data as InteractionRequestData} {...cardProps} />
    case "sound_chart":
      return <SoundChartCard data={checkpoint.data as SoundChartData} {...cardProps} />
    case "audio_chart":
      return <SoundChartCard data={checkpoint.data as AudioChartData} {...cardProps} />
    case "direction":
      return <DirectionCard data={checkpoint.data as DirectionData} {...cardProps} />
    case "escaleta":
      return <CheckpointCard data={checkpoint.data as unknown as import("../types").CheckpointData} {...cardProps} />
    case "validation":
      return <ValidationReportCard data={checkpoint.data as ValidationReportData} {...cardProps} />
    case "target_selection":
      return <TargetSelectionCard data={checkpoint.data as TargetSelectionData} {...cardProps} />
    case "revision_plan":
      return <RevisionPlanCard data={checkpoint.data as RevisionPlanData} {...cardProps} />
    case "variant_plan":
      return <VariantPlanCard data={checkpoint.data as VariantPlanData} {...cardProps} />
    case "generic":
      return <GenericCheckpointCard data={checkpoint.data} {...cardProps} />
    default:
      return null
  }
}

export function ChatThread({
  messages,
  getSubagentsByMessage,
  activeSubagents,
  checkpoint,
  checkpointHandlers,
  enrichments,
  isLoading,
  loadingLabel,
  error,
  onRetry,
  currentStage,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isLoading, activeSubagents.length, checkpoint])

  // Collect subagent IDs already linked to messages to avoid duplicating at the bottom
  const linkedSubagentIds = useMemo(() => {
    const ids = new Set<string>()
    for (const msg of messages) {
      if (msg.type !== "ai") continue
      for (const sub of getSubagentsByMessage(msg.id)) {
        ids.add(sub.id)
      }
    }
    return ids
  }, [messages, getSubagentsByMessage])

  const unlinkedActive = activeSubagents.filter((s) => !linkedSubagentIds.has(s.id))

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
      {messages.length === 0 && !isLoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: theme.colors.text.muted, letterSpacing: "-0.02em" }}>
            Video Generator
          </div>
          <div
            style={{
              fontSize: 14,
              color: theme.colors.text.muted,
              maxWidth: 360,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Describe el video que necesitas y el pipeline de agentes se encargara de investigar, escribir, dirigir y
            renderizar.
          </div>
        </div>
      )}

      {messages.map((msg) => {
        if (msg.type === "human") {
          const content = stripTargetMetadata(getMessageContent(msg))
          if (!content) return null
          return <MessageBubble key={msg.id} message={{ id: msg.id, role: "user", content }} />
        }

        if (msg.type === "ai") {
          const content = getMessageContent(msg)
          const subagents = getSubagentsByMessage(msg.id)

          return (
            <div key={msg.id}>
              {content && (
                <MessageBubble
                  message={{
                    id: msg.id,
                    role: "assistant",
                    content,
                  }}
                />
              )}
              {subagents.map((sub) => (
                <SubagentCard key={sub.id} subagent={sub} />
              ))}
            </div>
          )
        }

        return null
      })}

      {/* Active subagents not yet linked to any message */}
      {unlinkedActive.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {unlinkedActive.map((sub) => (
            <SubagentCard key={sub.id} subagent={sub} defaultExpanded />
          ))}
        </div>
      )}

      {/* Checkpoint card (from interrupt) */}
      {checkpoint && renderCheckpointCard(checkpoint, checkpointHandlers, isLoading)}

      {/* Enrichments (video results, system messages) */}
      {enrichments.map((e) => {
        if (e.type === "video_result" && e.data) {
          return (
            <div key={e.id}>
              <MessageBubble message={{ id: e.id, role: "assistant", content: e.content }} />
              <VideoResultCard
                jobId={e.data.jobId as string}
                title={(e.data.title as string) ?? null}
                fileSize={(e.data.fileSize as number) ?? null}
              />
            </div>
          )
        }
        return <MessageBubble key={e.id} message={{ id: e.id, role: "assistant", content: e.content }} />
      })}

      {/* Error banner */}
      {error && <ErrorBanner message={error instanceof Error ? error.message : String(error)} onRetry={onRetry} />}

      {currentStage === "rendering" && isLoading && activeSubagents.length === 0 && <RenderProgress progress={0} />}

      {/* Loading indicator when no subagents visible yet */}
      {isLoading && activeSubagents.length === 0 && !error && currentStage !== "rendering" && (
        <WorkingIndicator label={loadingLabel} />
      )}

      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd packages/web && npx tsc --noEmit 2>&1 | grep ChatThread`

Expected: May have type errors from `Message` import — adjust the import path if needed. The `Message` type from `@langchain/langgraph-sdk` has `{ type, content, id }` which is all we use.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ChatThread.tsx
git commit -m "refactor(web): ChatThread renders SDK messages as chat + SubagentCards as details"
```

---

## Task 5: Update `App.tsx` — use `useVideoStream`

**Files:**

- Modify: `packages/web/src/App.tsx`

This is the biggest simplification. The key changes:

1. Replace `useAgentStream` with `useVideoStream`
2. Remove `handleAgentComplete` callback (SDK handles message lifecycle)
3. Remove `addMessage` for agent summaries (no more agent messages)
4. Thread management via SDK's `switchThread` + `onThreadId`
5. Checkpoint handlers call `stream.resume` instead of `stream.resumeStream`
6. Video result detection moved to `onFinish` effect
7. Keep: video artifact management, sidebar, header, input bar

- [ ] **Step 1: Rewrite App.tsx**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ActiveVideoTarget, CheckpointType, Enrichment, StoredVideoArtifact } from "./types"
import { client, fetchConfigs, fetchJobStatus, fetchLatestRender } from "./api"
import { useVideoStream } from "./hooks/useVideoStream"
import { usePipelineTracker } from "./hooks/usePipelineTracker"
import { AppLayout } from "./components/AppLayout"
import { Sidebar } from "./components/Sidebar"
import { Header } from "./components/Header"
import { ChatThread } from "./components/ChatThread"
import { InputBar } from "./components/InputBar"
import {
  getThreads,
  saveThread,
  removeThread,
  getCurrentThreadId,
  setCurrentThreadId,
  getActiveVideoTarget,
  getVideoArtifacts,
  saveVideoArtifact,
  setActiveVideoTarget,
  type StoredThread,
} from "./lib/threadStorage"
import { stripTargetMetadata } from "./lib/targetMetadata"

function artifactFromCompletedJob(job: {
  id: string
  config_id: string | null
  title: string | null
  composition: string
}): StoredVideoArtifact {
  return {
    id: job.id,
    configPath: `.generated/renders/${job.id}/config.json`,
    configId: job.config_id ?? undefined,
    jobId: job.id,
    composition: job.composition,
    title: job.title ?? job.config_id ?? job.id,
    createdAt: new Date().toISOString(),
    source: "render",
  }
}

function artifactFromConfig(config: {
  configPath: string
  configId?: string
  jobId?: string
  title?: string
  composition?: string
  sceneCount?: number
  durationSeconds?: number
  source?: "content" | "render"
}): StoredVideoArtifact {
  return {
    id: config.jobId ?? config.configPath,
    configPath: config.configPath,
    configId: config.configId,
    jobId: config.jobId,
    composition: config.composition,
    title: config.title ?? config.configId ?? config.configPath,
    createdAt: new Date().toISOString(),
    sceneCount: config.sceneCount,
    durationSeconds: config.durationSeconds,
    source: config.source,
  }
}

function mergeArtifacts(primary: StoredVideoArtifact[], secondary: StoredVideoArtifact[]): StoredVideoArtifact[] {
  const seen = new Set<string>()
  const merged: StoredVideoArtifact[] = []
  for (const artifact of [...primary, ...secondary]) {
    const key = artifact.jobId ? `job:${artifact.jobId}` : `config:${artifact.configPath}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(artifact)
  }
  return merged
}

export default function App() {
  const [input, setInput] = useState("")
  const [storedThreads, setStoredThreads] = useState<StoredThread[]>(() => getThreads())
  const [videoArtifacts, setVideoArtifacts] = useState<StoredVideoArtifact[]>(() => getVideoArtifacts())
  const [activeTarget, setActiveTargetState] = useState(() => getActiveVideoTarget())
  const activeTargetRef = useRef(activeTarget)
  activeTargetRef.current = activeTarget
  const pipeline = usePipelineTracker()

  const videoStream = useVideoStream({
    onPipelineAdvance: (stage, message) => {
      pipeline.advance(stage as Parameters<typeof pipeline.advance>[0], message)
    },
    onPipelineMode: (mode) => {
      pipeline.setMode(mode)
    },
    onThreadCreated: (threadId) => {
      saveThread({
        threadId,
        title: input.trim().slice(0, 60) || "Nueva conversacion",
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      })
      setStoredThreads(getThreads())
      setCurrentThreadId(threadId)
    },
  })

  // Load configs on mount
  useEffect(() => {
    fetchConfigs()
      .then((response) => {
        const fromConfigs = response.configs
          .filter((config) => !config.error)
          .map((config) => artifactFromConfig(config))
        const merged = mergeArtifacts(fromConfigs, getVideoArtifacts())
        setVideoArtifacts(merged)
      })
      .catch((err) => console.warn("[init] fetchConfigs failed:", err))
  }, [])

  // Restore thread from localStorage on mount
  useEffect(() => {
    const storedId = getCurrentThreadId()
    if (storedId) {
      videoStream.switchThread(storedId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Detect video results when stream finishes
  useEffect(() => {
    if (videoStream.isLoading) return
    if (!videoStream.messages.length) return
    if (videoStream.checkpoint) return // interrupted, not finished

    const lastMsg = videoStream.messages[videoStream.messages.length - 1]
    if (lastMsg.type !== "ai") return

    const content = typeof lastMsg.content === "string" ? lastMsg.content : ""
    const jobIdMatch = content.match(/jobId[:\s]*["']?([a-f0-9-]+)["']?/i)

    if (jobIdMatch) {
      fetchJobStatus(jobIdMatch[1])
        .then((job) => {
          if (job.status === "done") {
            const artifact = artifactFromCompletedJob(job)
            saveVideoArtifact(artifact)
            setVideoArtifacts(getVideoArtifacts())
            setActiveVideoTarget(artifact)
            setActiveTargetState(artifact)
            videoStream.addEnrichment({
              id: crypto.randomUUID(),
              type: "video_result",
              content: "Video listo:",
              data: { jobId: job.id, title: job.title, fileSize: job.file_size },
            })
          }
        })
        .catch((err) => console.warn("[auto-lookup] fetchJobStatus failed:", err))
    } else if (activeTargetRef.current?.configId) {
      const targetConfigId = activeTargetRef.current.configId
      fetchLatestRender(targetConfigId)
        .then((job) => {
          if (job) {
            videoStream.addEnrichment({
              id: crypto.randomUUID(),
              type: "video_result",
              content: "Video listo:",
              data: { jobId: job.id, title: job.title, fileSize: job.file_size },
            })
          }
        })
        .catch((err) => console.warn("[auto-lookup] fetchLatestRender failed:", err))
    }
  }, [videoStream.isLoading, videoStream.messages, videoStream.checkpoint]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewThread = useCallback(() => {
    videoStream.switchThread(null)
    setCurrentThreadId(null)
    setActiveVideoTarget(null)
    setActiveTargetState(null)
    pipeline.reset()
  }, [videoStream, pipeline])

  const handleSelectTarget = useCallback(
    (target: StoredVideoArtifact | null) => {
      setActiveVideoTarget(target)
      setActiveTargetState(target)
      if (target?.jobId) {
        videoStream.addEnrichment({
          id: crypto.randomUUID(),
          type: "video_result",
          content: "Video listo:",
          data: { jobId: target.jobId, title: target.title ?? target.configId ?? target.jobId, fileSize: null },
        })
        return
      }
      if (target?.configId) {
        fetchLatestRender(target.configId)
          .then((job) => {
            if (job) {
              videoStream.addEnrichment({
                id: crypto.randomUUID(),
                type: "video_result",
                content: "Video listo:",
                data: { jobId: job.id, title: job.title, fileSize: job.file_size },
              })
            }
          })
          .catch(() => {})
      }
    },
    [videoStream],
  )

  const handleSelectThread = useCallback(
    (tid: string) => {
      videoStream.switchThread(tid)
      setCurrentThreadId(tid)
      pipeline.reset()
    },
    [videoStream, pipeline],
  )

  const handleDeleteThread = useCallback(
    (tid: string) => {
      removeThread(tid)
      setStoredThreads(getThreads())
      if (tid === videoStream.threadId) handleNewThread()
    },
    [videoStream.threadId, handleNewThread],
  )

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || videoStream.isLoading) return
    setInput("")
    pipeline.reset()
    videoStream.submit(text, activeTarget)
  }, [input, videoStream, pipeline, activeTarget])

  const createCheckpointHandlers = useCallback(
    (approvedMessage: string, _feedbackPrefix: string) => ({
      onApprove: (payload?: Record<string, unknown>) => {
        if (videoStream.isLoading) return
        videoStream.resume({ approved: true, ...payload })
      },
      onRequestChanges: (feedback: string) => {
        if (videoStream.isLoading) return
        videoStream.resume({ approved: false, feedback })
      },
    }),
    [videoStream],
  )

  const checkpointHandlers = useMemo(
    () => ({
      escaleta: createCheckpointHandlers("Aprobado", "Cambios solicitados"),
      direction: createCheckpointHandlers("Direccion aprobada", "Ajustes de direccion"),
      sound_chart: createCheckpointHandlers("Sonido aprobado", "Ajustes de sonido"),
      audio_chart: createCheckpointHandlers("Audio aprobado", "Ajustes de audio"),
      interaction: createCheckpointHandlers("Respuesta enviada", "Respuesta"),
      validation: createCheckpointHandlers("Validacion aprobada", "Ajustes de validacion"),
      target_selection: createCheckpointHandlers("Target seleccionado", "Seleccion de target"),
      revision_plan: createCheckpointHandlers("Plan aprobado", "Ajustes del plan"),
      variant_plan: createCheckpointHandlers("Variante aprobada", "Ajustes de variante"),
      generic: createCheckpointHandlers("Aprobado", "Cambios"),
    }),
    [createCheckpointHandlers],
  )

  return (
    <AppLayout
      sidebar={
        <Sidebar
          currentStage={pipeline.state.currentStage}
          mode={pipeline.state.mode}
          events={pipeline.state.events}
          threads={storedThreads}
          currentThreadId={videoStream.threadId ?? undefined}
          onSelectThread={handleSelectThread}
          onDeleteThread={handleDeleteThread}
          onNewThread={handleNewThread}
        />
      }
      main={
        <>
          <Header artifacts={videoArtifacts} activeTarget={activeTarget} onSelectTarget={handleSelectTarget} />
          <ChatThread
            messages={videoStream.messages}
            getSubagentsByMessage={videoStream.getSubagentsByMessage}
            activeSubagents={videoStream.activeSubagents}
            checkpoint={videoStream.checkpoint}
            checkpointHandlers={checkpointHandlers}
            enrichments={videoStream.enrichments}
            isLoading={videoStream.isLoading}
            loadingLabel={pipeline.getLoadingLabel()}
            error={videoStream.error}
            onRetry={() => {}}
            currentStage={pipeline.state.currentStage}
          />
          <InputBar
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={videoStream.isLoading}
            activeTarget={activeTarget}
          />
        </>
      }
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/web && npx tsc --noEmit 2>&1 | head -20`

Expected: Should compile cleanly. If not, fix type errors iteratively — likely in the `Message` type from the SDK or in `useVideoStream` return types.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "refactor(web): App uses useVideoStream, simplified thread/checkpoint management"
```

---

## Task 6: Update `api.ts` — remove unused exports

**Files:**

- Modify: `packages/web/src/api.ts`

Remove `extractResponse` and `createThread` — both are now handled by the SDK. Keep the `client` export (still used by `App.tsx` for `client.threads.getState` on thread history, and potentially elsewhere), and all render-service API functions.

- [ ] **Step 1: Remove extractResponse and createThread**

Remove these functions and their associated type imports (keep types that are still used by checkpoint components or api functions):

- `extractResponse` function (lines 66-112)
- `createThread` function (lines 56-59)
- Remove `ASSISTANT_ID` export if no longer needed (now in `useVideoStream`)
- Clean up unused type imports from the import block

The file should retain:

- `client` export
- `fetchJobStatus`, `fetchJobs`, `fetchConfigs`, `fetchLatestRender`
- `getStreamUrl`, `getDownloadUrl`

- [ ] **Step 2: Check for remaining consumers**

Run: `grep -rn "extractResponse\|createThread\|ASSISTANT_ID" packages/web/src/ --include="*.ts" --include="*.tsx" | grep -v api.ts | grep -v node_modules`

Expected: No matches. If there are, fix those imports.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/api.ts
git commit -m "refactor(web): remove extractResponse and createThread — SDK handles both"
```

---

## Task 7: Delete old files

**Files:**

- Delete: `packages/web/src/hooks/useAgentStream.ts`
- Delete: `packages/web/src/lib/streamEvents.ts`
- Delete: `packages/web/src/lib/streamEvents.test.ts`
- Delete: `packages/web/src/lib/artifacts.ts`
- Delete: `packages/web/src/components/StreamingBubble.tsx`
- Delete: `packages/web/src/components/AgentArtifactCard.tsx`

- [ ] **Step 1: Verify no remaining imports**

Run: `grep -rn "useAgentStream\|StreamingBubble\|AgentArtifactCard\|from.*streamEvents\|from.*artifacts" packages/web/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test.ts"`

Expected: No matches. If there are straggler imports, fix them first.

- [ ] **Step 2: Delete the files**

```bash
rm packages/web/src/hooks/useAgentStream.ts
rm packages/web/src/lib/streamEvents.ts
rm packages/web/src/lib/streamEvents.test.ts
rm packages/web/src/lib/artifacts.ts
rm packages/web/src/components/StreamingBubble.tsx
rm packages/web/src/components/AgentArtifactCard.tsx
```

- [ ] **Step 3: Full TypeScript check**

Run: `cd packages/web && npx tsc --noEmit`

Expected: Clean compilation. Fix any remaining type errors.

- [ ] **Step 4: ESLint check**

Run: `cd packages/web && npx eslint src/ --max-warnings=0 2>&1 | tail -10`

Expected: No new errors. Fix any issues.

- [ ] **Step 5: Commit**

```bash
git add -A packages/web/src/
git commit -m "refactor(web): delete old streaming infrastructure replaced by SDK useStream"
```

---

## Task 8: Integration testing & fixes

**Files:**

- May touch any of the above files for bug fixes

- [ ] **Step 1: Start the dev server**

```bash
cd packages/web && npm run dev
```

Verify: Server starts at http://localhost:5173 without build errors.

- [ ] **Step 2: Test empty state**

Navigate to http://localhost:5173. Verify:

- "Video Generator" placeholder text visible
- No console errors
- Input bar functional

- [ ] **Step 3: Test conversational message**

Send: "Hola, que puedo hacer?"

Verify:

- User message appears as a red right-aligned bubble
- Coordinator response appears as a **regular chat bubble** (left-aligned, dark background) — NOT inside a collapsible card
- No `StreamingBubble` or agent summary cards visible

- [ ] **Step 4: Test pipeline with subagents**

Send: "Hazme un video sobre Docker Compose"

Verify:

- Pipeline starts in sidebar
- Subagent cards (researcher, copywriter, etc.) appear as collapsible accordions indented under the coordinator's message
- Active subagents show pulsing dot + spinner
- Completed subagents auto-collapse
- Coordinator's conversational messages appear as normal chat bubbles between subagent runs

- [ ] **Step 5: Test checkpoint**

When an escaleta/direction/audio checkpoint appears:

- Checkpoint card renders with approve/reject buttons
- Approve sends the decision and stream resumes
- Reject with feedback sends feedback and stream resumes

- [ ] **Step 6: Test thread switching**

- Click "+ Nueva conversacion"
- Send a message in the new thread
- Switch back to the previous thread
- Verify: messages load correctly from history

- [ ] **Step 7: Fix any issues found**

Address issues iteratively. Each fix gets its own commit.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "fix(web): integration fixes for conversational streaming UI"
```

---

## Task 9: Update CHANGELOG.md

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add changelog entry**

Under `[Unreleased]`:

```markdown
### Changed

- **Frontend conversational UI**: Coordinator messages now appear as first-class chat bubbles instead of collapsible agent cards. Subagent work (researcher, copywriter, director, etc.) renders as collapsible detail cards underneath the coordinator message that launched them.
- **Streaming infrastructure**: Replaced manual event parser (`useAgentStream`) with SDK-native `useStream` hook from `@langchain/langgraph-sdk/react`, providing built-in subagent lifecycle tracking, interrupt handling, and thread management.

### Removed

- `StreamingBubble`, `AgentArtifactCard` components (replaced by `SubagentCard`)
- `useAgentStream` hook, `streamEvents.ts`, `artifacts.ts` (replaced by SDK `useStream`)
- `extractResponse`, `createThread` API functions (handled by SDK internally)
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for conversational streaming UI refactor"
```

---

## Rollback Plan

If the SDK's `useStream` behaves unexpectedly at runtime (e.g., `filterSubagentMessages` doesn't work as expected, or the message format differs):

1. The old files are in git history — `git checkout HEAD~N -- packages/web/src/hooks/useAgentStream.ts` etc.
2. The `SubagentCard` component can be reused even with the old hook by adapting the props
3. The architectural insight (coordinator = chat, subagents = details) is valid regardless of SDK vs manual parsing — the rendering model in `ChatThread` can work with either data source
