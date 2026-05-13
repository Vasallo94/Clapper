import { useCallback, useEffect, useRef, useState } from "react"
import { useStream } from "@langchain/langgraph-sdk/react"
import type { Message } from "@langchain/langgraph-sdk"
import type { UseStreamOptions, SubagentStreamInterface, UseStream } from "@langchain/langgraph-sdk/react"
import { ASSISTANT_ID } from "../api"
import { appendTargetMetadata } from "../lib/targetMetadata"
import type { ActiveVideoTarget, CheckpointType, Enrichment, PipelineStageId } from "../types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = import.meta.env.VITE_LANGGRAPH_URL ?? "http://127.0.0.1:2024"

/**
 * Maps agent interrupt `value.type` strings to our internal CheckpointType.
 */
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

/**
 * Maps subagent_type strings to pipeline stage identifiers.
 */
const SUBAGENT_TO_STAGE: Record<string, PipelineStageId> = {
  orchestrator: "orchestrator",
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentState = Record<string, unknown>

/**
 * Extended options type that includes DeepAgent-specific fields.
 * The backend is a DeepAgent, but we don't have its type definition on the
 * frontend. We use UseStreamOptions plus the deep-agent extras.
 */
type DeepAgentStreamOptions = UseStreamOptions<AgentState> & {
  filterSubagentMessages?: boolean
  subagentToolNames?: string[]
}

/** Full UseStream interface with subagent support. */
type FullStream = UseStream<AgentState>

export interface UseVideoStreamOptions {
  /** Persisted thread ID to restore a conversation. */
  threadId?: string | null
  /** Called when the SDK creates or switches to a new thread. */
  onThreadId?: (threadId: string) => void
  /** Called when the pipeline advances to a new stage. */
  onPipelineAdvance?: (stage: PipelineStageId, message: string) => void
  /** Called on unrecoverable stream errors. */
  onError?: (error: unknown) => void
  /** The currently active video target — injected as metadata into messages. */
  activeTarget?: ActiveVideoTarget | null
}

export interface VideoStreamReturn {
  // --- SDK passthrough ---
  messages: Message[]
  isLoading: boolean
  error: unknown
  subagents: Map<string, SubagentStreamInterface>
  activeSubagents: SubagentStreamInterface[]
  getSubagentsByMessage: (messageId: string) => SubagentStreamInterface[]

  // --- Derived state ---
  /** Current checkpoint type derived from `stream.interrupt`, or null. */
  checkpointType: CheckpointType | null
  /** The raw interrupt value (checkpoint payload), or null. */
  checkpointData: Record<string, unknown> | null
  /** Whether an interrupt is currently active and resumable. */
  isInterrupted: boolean
  /** Local enrichments (video results, system messages). */
  enrichments: Enrichment[]

  // --- Actions ---
  /** Send a new user message. Injects target metadata automatically. */
  submit: (message: string) => void
  /** Resume from an interrupt with a decision payload. */
  resume: (decision: Record<string, unknown>) => void
  /** Switch to a different thread (or null to start fresh). */
  switchThread: (newThreadId: string | null) => void
  /** Add an enrichment (video result, system notice). */
  addEnrichment: (enrichment: Enrichment) => void
  /** Clear all enrichments. */
  clearEnrichments: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVideoStream(options: UseVideoStreamOptions = {}): VideoStreamReturn {
  const { threadId, onThreadId, onPipelineAdvance, onError, activeTarget } = options

  // Stable refs for callbacks to avoid re-creating the stream config
  const onPipelineAdvanceRef = useRef(onPipelineAdvance)
  onPipelineAdvanceRef.current = onPipelineAdvance
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const activeTargetRef = useRef(activeTarget)
  activeTargetRef.current = activeTarget

  // Local enrichments state
  const [enrichments, setEnrichments] = useState<Enrichment[]>([])

  // Track which subagent types we have already reported to avoid duplicates
  const reportedSubagentsRef = useRef<Set<string>>(new Set())

  // Track loading transitions for auto-done
  const wasLoadingRef = useRef(false)

  // ----- SDK useStream -----
  // The backend is a DeepAgent but we lack its TS type on the frontend.
  // We cast the options to include filterSubagentMessages / subagentToolNames
  // (accepted at runtime by the SDK even for the plain overload), and cast
  // the return to UseStream which surfaces the subagent APIs.
  const stream = useStream<AgentState>({
    apiUrl: API_URL,
    assistantId: ASSISTANT_ID,
    threadId: threadId ?? null,
    onThreadId,
    onError: (error: unknown) => {
      onErrorRef.current?.(error)
    },
    onFinish: () => {
      // Reset subagent tracking when a run finishes
      reportedSubagentsRef.current.clear()
    },
    filterSubagentMessages: true,
    subagentToolNames: ["task"],
  } as DeepAgentStreamOptions) as unknown as FullStream

  // ----- Pipeline stage tracking via activeSubagents -----
  useEffect(() => {
    for (const sub of stream.activeSubagents) {
      const subagentType = sub.toolCall?.args?.subagent_type
      if (!subagentType || typeof subagentType !== "string") continue
      if (reportedSubagentsRef.current.has(subagentType)) continue

      const stage = SUBAGENT_TO_STAGE[subagentType]
      if (stage) {
        reportedSubagentsRef.current.add(subagentType)
        onPipelineAdvanceRef.current?.(stage, `${subagentType} trabajando...`)
      }
    }
  }, [stream.activeSubagents])

  // ----- Checkpoint extraction from interrupt -----
  const interrupt = stream.interrupt
  const interruptValue =
    interrupt?.value && typeof interrupt.value === "object" ? (interrupt.value as Record<string, unknown>) : null

  const checkpointType: CheckpointType | null = (() => {
    if (!interruptValue) return null
    const rawType = typeof interruptValue.type === "string" ? interruptValue.type : null
    if (!rawType) return "generic"
    return CHECKPOINT_TYPE_MAP[rawType] ?? "generic"
  })()

  const isInterrupted = interrupt != null

  // ----- Auto-advance pipeline to "done" on stream finish -----
  useEffect(() => {
    const wasLoading = wasLoadingRef.current
    wasLoadingRef.current = stream.isLoading
    if (wasLoading && !stream.isLoading && !stream.error && !isInterrupted && stream.messages.length > 0) {
      onPipelineAdvanceRef.current?.("done", "Pipeline completado")
    }
  }, [stream.isLoading, stream.error, isInterrupted, stream.messages.length])

  // ----- Enrichments -----
  const addEnrichment = useCallback((enrichment: Enrichment) => {
    setEnrichments((prev) => [...prev, enrichment])
  }, [])

  const clearEnrichments = useCallback(() => {
    setEnrichments([])
  }, [])

  // ----- Submit (new message) -----
  const submit = useCallback(
    (message: string) => {
      const content = appendTargetMetadata(message, activeTargetRef.current)
      stream.submit({ messages: [{ type: "human" as const, content }] }, { streamSubgraphs: true })
    },
    [stream],
  )

  // ----- Resume (from interrupt) -----
  const resume = useCallback(
    (decision: Record<string, unknown>) => {
      if (checkpointType && interruptValue) {
        addEnrichment({
          id: crypto.randomUUID(),
          type: "resolved_checkpoint",
          content: "",
          data: {
            checkpointType,
            checkpointData: { ...interruptValue },
            userDecision: decision,
          },
        })
      }
      stream.submit(null, {
        command: { resume: decision },
        streamSubgraphs: true,
      })
    },
    [stream, checkpointType, interruptValue, addEnrichment],
  )

  // ----- Thread switching -----
  const switchThread = useCallback(
    (newThreadId: string | null) => {
      reportedSubagentsRef.current.clear()
      wasLoadingRef.current = false
      setEnrichments([])
      stream.switchThread(newThreadId)
    },
    [stream],
  )

  return {
    // SDK passthrough
    messages: stream.messages,
    isLoading: stream.isLoading,
    error: stream.error,
    subagents: stream.subagents,
    activeSubagents: stream.activeSubagents,
    getSubagentsByMessage: stream.getSubagentsByMessage,

    // Derived
    checkpointType,
    checkpointData: interruptValue,
    isInterrupted,
    enrichments,

    // Actions
    submit,
    resume,
    switchThread,
    addEnrichment,
    clearEnrichments,
  }
}
