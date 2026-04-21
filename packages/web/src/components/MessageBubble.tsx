import type { ChatMessage } from "../types"
import { theme } from "../theme"

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div
      className="animate-slide-in"
      style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "10px 14px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          backgroundColor: isUser ? theme.colors.accent.primary : theme.colors.bg.elevated,
          color: isUser ? "#fff" : theme.colors.text.primary,
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          border: isUser ? "none" : `1px solid ${theme.colors.border.default}`,
        }}
      >
        {message.content}
      </div>
    </div>
  )
}
