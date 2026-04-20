import { useEffect, useRef } from "react"
import type { ChatMessage } from "../types"
import { MessageBubble } from "./MessageBubble"
import { CheckpointCard } from "./CheckpointCard"

interface Props {
  messages: ChatMessage[]
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
  loading: boolean
}

export function ChatWindow({ messages, onApprove, onRequestChanges, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

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
      {loading && (
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
