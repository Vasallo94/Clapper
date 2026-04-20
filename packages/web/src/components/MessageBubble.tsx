import type { ChatMessage } from "../types"

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "75%",
          padding: "10px 14px",
          borderRadius: 12,
          backgroundColor: isUser ? "#CC3333" : "#f0f0f0",
          color: isUser ? "#fff" : "#1a1a1a",
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {message.content}
      </div>
    </div>
  )
}
