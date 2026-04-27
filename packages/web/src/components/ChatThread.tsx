import React, { useEffect, useRef } from "react"
import type { ChatMessage, CheckpointData, DirectionData, PipelineStageId, SoundChartData } from "../types"
import type { StreamState } from "../hooks/useAgentStream"
import { CheckpointCard } from "./CheckpointCard"
import { DirectionCard } from "./DirectionCard"
import { GenericCheckpointCard } from "./GenericCheckpointCard"
import { SoundChartCard } from "./SoundChartCard"
import { StreamingBubble } from "./StreamingBubble"
import { ErrorBanner } from "./ErrorBanner"
import { MessageBubble } from "./MessageBubble"
import { VideoResultCard } from "./VideoResultCard"
import { RenderProgress } from "./RenderProgress"
import { theme } from "../theme"

interface Props {
  messages: ChatMessage[]
  streamState: StreamState
  checkpointHandlers: Record<string, { onApprove: () => void; onRequestChanges: (feedback: string) => void }>
  loading: boolean
  loadingLabel: string
  onRetry?: () => void
  currentStage?: PipelineStageId
}

export function ChatThread({
  messages,
  streamState,
  checkpointHandlers,
  loading,
  loadingLabel,
  onRetry,
  currentStage,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, loading, streamState.activeAgent, streamState.tools.length])

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
      {messages.length === 0 && !loading && (
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
        if (msg.role === "agent" && msg.agentSummary) {
          return (
            <StreamingBubble
              key={msg.id}
              agentName={msg.agentSummary.name}
              tools={msg.agentSummary.tools}
              status="completed"
              durationMs={msg.agentSummary.durationMs}
              defaultExpanded={false}
            />
          )
        }
        if (msg.checkpointType === "video_result" && msg.checkpoint) {
          const data = msg.checkpoint as { jobId: string; title: string | null; fileSize: number | null }
          return (
            <div key={msg.id}>
              <MessageBubble message={{ ...msg, checkpoint: undefined }} />
              <VideoResultCard jobId={data.jobId} title={data.title} fileSize={data.fileSize} />
            </div>
          )
        }
        if (msg.checkpointType && msg.checkpoint && checkpointHandlers[msg.checkpointType]) {
          const handlers = checkpointHandlers[msg.checkpointType]
          const bubble = <MessageBubble message={{ ...msg, checkpoint: undefined }} />
          const cardProps = {
            onApprove: handlers.onApprove,
            onRequestChanges: handlers.onRequestChanges,
            disabled: loading,
          }

          let card: React.ReactNode = null
          if (msg.checkpointType === "sound_chart")
            card = <SoundChartCard data={msg.checkpoint as SoundChartData} {...cardProps} />
          else if (msg.checkpointType === "direction")
            card = <DirectionCard data={msg.checkpoint as DirectionData} {...cardProps} />
          else if (msg.checkpointType === "escaleta")
            card = <CheckpointCard data={msg.checkpoint as CheckpointData} {...cardProps} />
          else if (msg.checkpointType === "generic")
            card = <GenericCheckpointCard data={msg.checkpoint as Record<string, unknown>} {...cardProps} />

          if (card) {
            return (
              <div key={msg.id}>
                {bubble}
                {card}
              </div>
            )
          }
        }
        return <MessageBubble key={msg.id} message={msg} />
      })}

      {/* Active agent bubble (only the currently running one) */}
      {streamState.activeAgent && (
        <div style={{ marginBottom: 8 }}>
          <StreamingBubble
            agentName={streamState.activeAgent}
            tools={streamState.tools}
            llmText={streamState.llmText}
            status="active"
            defaultExpanded={true}
          />
        </div>
      )}

      {/* Error banner */}
      {streamState.error && <ErrorBanner message={streamState.error} onRetry={onRetry} />}

      {currentStage === "rendering" && loading && !streamState.activeAgent && <RenderProgress progress={0} />}

      {/* Loading indicator (only when streaming but no active agent detected yet) */}
      {loading && !streamState.activeAgent && !streamState.error && currentStage !== "rendering" && (
        <div className="animate-slide-in" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "12px 12px 12px 2px",
              backgroundColor: theme.colors.bg.elevated,
              border: `1px solid ${theme.colors.border.default}`,
              fontSize: 13,
              color: theme.colors.text.secondary,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>{loadingLabel}</span>
            <span style={{ display: "flex", gap: 3 }}>
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
