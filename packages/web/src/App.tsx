import { useState } from "react"
import type { ChatMessage } from "./types"
import { sendMessage, resumeCheckpoint } from "./api"
import { ChatWindow } from "./components/ChatWindow"

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [threadId, setThreadId] = useState<string>()
  const [loading, setLoading] = useState(false)

  const addMessage = (role: ChatMessage["role"], content: string, checkpoint?: ChatMessage["checkpoint"]): string => {
    const id = crypto.randomUUID()
    setMessages((prev) => [...prev, { id, role, content, checkpoint }])
    return id
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    addMessage("user", text)
    setLoading(true)

    try {
      const res = await sendMessage(text, threadId)
      setThreadId(res.thread_id)

      if (res.type === "checkpoint") {
        addMessage("assistant", "He preparado una propuesta de escaleta:", res.data)
      } else {
        addMessage("assistant", res.content || "")
      }
    } catch (err) {
      addMessage("assistant", `Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!threadId || loading) return
    addMessage("user", "Aprobado")
    setLoading(true)

    try {
      const res = await resumeCheckpoint(threadId, { approved: true })
      if (res.type === "checkpoint") {
        addMessage("assistant", "Nuevo checkpoint:", res.data)
      } else {
        addMessage("assistant", res.content || "")
      }
    } catch (err) {
      addMessage("assistant", `Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestChanges = async (feedback: string) => {
    if (!threadId || loading) return
    addMessage("user", `Cambios solicitados: ${feedback}`)
    setLoading(true)

    try {
      const res = await resumeCheckpoint(threadId, { approved: false, feedback })
      if (res.type === "checkpoint") {
        addMessage("assistant", "Escaleta revisada:", res.data)
      } else {
        addMessage("assistant", res.content || "")
      }
    } catch (err) {
      addMessage("assistant", `Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 720, margin: "0 auto" }}>
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "2px solid #CC3333",
          fontSize: 18,
          fontWeight: 600,
          color: "#CC3333",
        }}
      >
        Video Generator
      </header>

      <ChatWindow
        messages={messages}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
        loading={loading}
      />

      <div style={{ padding: 12, borderTop: "1px solid #ddd", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Describe el video que necesitas..."
          disabled={loading}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#CC3333",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontSize: 14,
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
