import { useEffect, useRef } from "react"
import type { AgentStreamStatus, ChatMessage } from "../types"
import { CheckpointCard } from "./CheckpointCard"
import { ErrorBanner } from "./ErrorBanner"
import { MessageBubble } from "./MessageBubble"
import { RenderProgress } from "./RenderProgress"
import { SubagentBadge } from "./SubagentBadge"

interface Props {
  messages: ChatMessage[]
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
  loading: boolean
  activeAgent: string | null
  renderProgress: number
  streamStatus: AgentStreamStatus
  streamError: string | null
}

export function ChatWindow({
  messages,
  onApprove,
  onRequestChanges,
  loading,
  activeAgent,
  renderProgress,
  streamError,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, activeAgent, renderProgress])

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      {messages.map((msg) =>
        msg.checkpoint ? (
          <CheckpointCard
            key={msg.id}
            data={msg.checkpoint}
            onApprove={onApprove}
            onRequestChanges={onRequestChanges}
            disabled={loading}
          />
        ) : (
          <MessageBubble key={msg.id} message={msg} />
        ),
      )}
      {activeAgent && <SubagentBadge agentName={activeAgent} />}
      {renderProgress > 0 && renderProgress < 100 && <RenderProgress progress={renderProgress} />}
      {streamError && <ErrorBanner message={streamError} />}
      {loading && !activeAgent && (
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", borderRadius: 12, backgroundColor: "#f0f0f0", fontSize: 14 }}>
            Pensando...
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
