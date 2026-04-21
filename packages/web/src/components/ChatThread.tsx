import { useEffect, useRef } from "react"
import type { ChatMessage, CheckpointData, SoundChartData } from "../types"
import { CheckpointCard } from "./CheckpointCard"
import { SoundChartCard } from "./SoundChartCard"
import { MessageBubble } from "./MessageBubble"
import { theme } from "../theme"

interface Props {
  messages: ChatMessage[]
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
  onSoundApprove: () => void
  onSoundRequestChanges: (feedback: string) => void
  loading: boolean
  loadingLabel: string
}

export function ChatThread({
  messages,
  onApprove,
  onRequestChanges,
  onSoundApprove,
  onSoundRequestChanges,
  loading,
  loadingLabel,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, loading])

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
        if (msg.checkpointType === "sound_chart" && msg.checkpoint) {
          return (
            <div key={msg.id}>
              <MessageBubble message={{ ...msg, checkpoint: undefined }} />
              <SoundChartCard
                data={msg.checkpoint as SoundChartData}
                onApprove={onSoundApprove}
                onRequestChanges={onSoundRequestChanges}
                disabled={loading}
              />
            </div>
          )
        }
        if (msg.checkpointType === "escaleta" && msg.checkpoint) {
          return (
            <div key={msg.id}>
              <MessageBubble message={{ ...msg, checkpoint: undefined }} />
              <CheckpointCard
                data={msg.checkpoint as CheckpointData}
                onApprove={onApprove}
                onRequestChanges={onRequestChanges}
                disabled={loading}
              />
            </div>
          )
        }
        return <MessageBubble key={msg.id} message={msg} />
      })}

      {loading && (
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
