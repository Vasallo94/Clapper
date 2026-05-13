import React, { useEffect, useMemo, useRef } from "react"
import type { Message } from "@langchain/langgraph-sdk"
import type { SubagentStreamInterface } from "@langchain/langgraph-sdk/react"
import type {
  AudioChartData,
  CheckpointData,
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
import { stripTargetMetadata } from "../lib/targetMetadata"
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

// ---------------------------------------------------------------------------
// Helpers — resolved checkpoint badge
// ---------------------------------------------------------------------------

function UserDecisionBadge({ decision }: { decision: Record<string, unknown> }) {
  let label = "Respondido"
  if (decision.approved === true && decision.selectedValue) {
    label = `Seleccionado: ${decision.selectedValue}`
  } else if (decision.approved === true && decision.selectedOptions) {
    const opts = decision.selectedOptions as Array<{ label: string }>
    label = `Seleccionados: ${opts.map((o) => o.label).join(", ")}`
  } else if (decision.approved === true && decision.answer) {
    label = "Respuesta enviada"
  } else if (decision.approved === true) {
    label = "Aprobado"
  } else if (decision.approved === false) {
    label = "Cambios solicitados"
  }
  return (
    <div
      style={{
        fontSize: 11,
        color: theme.colors.text.muted,
        fontFamily: theme.fonts.mono,
        padding: "4px 8px",
        marginTop: 4,
      }}
    >
      {label}
    </div>
  )
}

const DISABLED_HANDLERS = {
  onApprove: () => {},
  onRequestChanges: () => {},
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  messages: Message[]
  getSubagentsByMessage: (msgId: string) => SubagentStreamInterface[]
  activeSubagents: SubagentStreamInterface[]
  checkpointType: CheckpointType | null
  checkpointData: Record<string, unknown> | null
  checkpointHandlers: Record<
    string,
    {
      onApprove: (payload?: Record<string, unknown>) => void
      onRequestChanges: (feedback: string) => void
    }
  >
  enrichments: Enrichment[]
  isLoading: boolean
  loadingLabel: string
  error: unknown
  onRetry?: () => void
  currentStage?: PipelineStageId
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract displayable text from an SDK Message whose content may be
 * `string | MessageContentComplex[]`.
 */
function getMessageContent(msg: Message): string {
  if (typeof msg.content === "string") return msg.content
  if (Array.isArray(msg.content))
    return msg.content
      .filter(
        (c): c is { type: "text"; text: string } =>
          typeof c === "object" && c !== null && "type" in c && c.type === "text",
      )
      .map((c) => c.text)
      .join("")
  return ""
}

/**
 * Render the appropriate checkpoint card for the given type/data.
 */
function renderCheckpointCard(
  type: CheckpointType,
  data: Record<string, unknown>,
  handlers: {
    onApprove: (payload?: Record<string, unknown>) => void
    onRequestChanges: (feedback: string) => void
  },
  disabled: boolean,
): React.ReactNode {
  const cardProps = {
    onApprove: handlers.onApprove,
    onRequestChanges: handlers.onRequestChanges,
    disabled,
  }

  switch (type) {
    case "interaction":
      return <InteractionRequestCard data={data as unknown as InteractionRequestData} {...cardProps} />
    case "sound_chart":
      return <SoundChartCard data={data as unknown as SoundChartData} {...cardProps} />
    case "audio_chart":
      return <SoundChartCard data={data as unknown as AudioChartData} {...cardProps} />
    case "direction":
      return <DirectionCard data={data as unknown as DirectionData} {...cardProps} />
    case "escaleta":
      return <CheckpointCard data={data as unknown as CheckpointData} {...cardProps} />
    case "validation":
      return <ValidationReportCard data={data as unknown as ValidationReportData} {...cardProps} />
    case "target_selection":
      return <TargetSelectionCard data={data as unknown as TargetSelectionData} {...cardProps} />
    case "revision_plan":
      return <RevisionPlanCard data={data as unknown as RevisionPlanData} {...cardProps} />
    case "variant_plan":
      return <VariantPlanCard data={data as unknown as VariantPlanData} {...cardProps} />
    case "video_result":
      return null // handled via enrichments
    case "generic":
      return <GenericCheckpointCard data={data} {...cardProps} />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatThread({
  messages,
  getSubagentsByMessage,
  activeSubagents,
  checkpointType,
  checkpointData,
  checkpointHandlers,
  enrichments,
  isLoading,
  loadingLabel,
  error,
  onRetry,
  currentStage,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isLoading, activeSubagents.length, enrichments.length])

  // Collect subagent IDs already rendered inline under a message so we skip
  // them in the "unlinked active subagents" section at the bottom.
  const linkedSubagentIds = useMemo(() => {
    const ids = new Set<string>()
    for (const msg of messages) {
      const msgId = msg.id
      if (!msgId) continue
      for (const sub of getSubagentsByMessage(msgId)) {
        ids.add(sub.id)
      }
    }
    return ids
  }, [messages, getSubagentsByMessage])

  // Active subagents not yet linked to any message
  const unlinkedActiveSubagents = useMemo(
    () => activeSubagents.filter((sub) => !linkedSubagentIds.has(sub.id)),
    [activeSubagents, linkedSubagentIds],
  )

  // Determine if there's any active subagent (for loading indicator logic)
  const hasActiveSubagent = activeSubagents.length > 0

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
      {/* Empty state */}
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

      {/* Message list */}
      {messages.map((msg, i) => {
        const msgId = msg.id ?? `msg-${i}`
        const rawContent = getMessageContent(msg)

        // --- Human messages → user bubble ---
        if (msg.type === "human") {
          const displayContent = stripTargetMetadata(rawContent)
          if (!displayContent.trim()) return null
          return <MessageBubble key={msgId} message={{ id: msgId, role: "user", content: displayContent }} />
        }

        // --- AI messages ---
        if (msg.type === "ai") {
          const linkedSubs = msg.id ? getSubagentsByMessage(msg.id) : []
          const hasContent = rawContent.trim().length > 0

          // AI message with no content and no linked subagents → skip
          if (!hasContent && linkedSubs.length === 0) return null

          return (
            <React.Fragment key={msgId}>
              {/* Render the text bubble only if there is content */}
              {hasContent && <MessageBubble message={{ id: msgId, role: "assistant", content: rawContent }} />}

              {/* Render linked subagent cards underneath */}
              {linkedSubs.map((sub) => (
                <SubagentCard
                  key={sub.id}
                  subagent={sub}
                  defaultExpanded={sub.status === "running" || sub.status === "pending"}
                />
              ))}
            </React.Fragment>
          )
        }

        // Other message types (tool, system, etc.) — skip rendering
        return null
      })}

      {/* Unlinked active subagents (still running, not yet associated with a message) */}
      {unlinkedActiveSubagents.map((sub) => (
        <SubagentCard key={sub.id} subagent={sub} defaultExpanded={true} />
      ))}

      {/* Checkpoint card (from active interrupt) */}
      {checkpointType && checkpointData && checkpointHandlers[checkpointType] && (
        <div style={{ marginTop: 8 }}>
          {renderCheckpointCard(checkpointType, checkpointData, checkpointHandlers[checkpointType], isLoading)}
        </div>
      )}

      {/* Enrichments (resolved checkpoints, video results, system messages) */}
      {enrichments.map((enrichment) => {
        if (enrichment.type === "resolved_checkpoint" && enrichment.data) {
          const cpType = enrichment.data.checkpointType as CheckpointType
          const cpData = enrichment.data.checkpointData as Record<string, unknown>
          const userDecision = enrichment.data.userDecision as Record<string, unknown>
          if (!cpType || !cpData) return null
          return (
            <div key={enrichment.id} style={{ marginTop: 8, opacity: 0.7, pointerEvents: "none" }}>
              {renderCheckpointCard(cpType, cpData, DISABLED_HANDLERS, true)}
              <UserDecisionBadge decision={userDecision} />
            </div>
          )
        }
        if (enrichment.type === "video_result" && enrichment.data) {
          const data = enrichment.data as { jobId: string; title: string | null; fileSize: number | null }
          return <VideoResultCard key={enrichment.id} jobId={data.jobId} title={data.title} fileSize={data.fileSize} />
        }
        // System enrichment — render as assistant message
        return (
          <MessageBubble
            key={enrichment.id}
            message={{ id: enrichment.id, role: "assistant", content: enrichment.content }}
          />
        )
      })}

      {/* Error banner */}
      {error != null && <ErrorBanner message={typeof error === "string" ? error : String(error)} onRetry={onRetry} />}

      {/* Render progress bar */}
      {currentStage === "rendering" && isLoading && !hasActiveSubagent && <RenderProgress progress={0} />}

      {/* Loading indicator (only when streaming but no active subagent detected yet) */}
      {isLoading && !hasActiveSubagent && !error && currentStage !== "rendering" && (
        <WorkingIndicator label={loadingLabel} />
      )}

      <div ref={bottomRef} />
    </div>
  )
}
