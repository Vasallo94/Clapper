import type { ChatResponse } from "./types"

const API_BASE = "http://localhost:8000"

export async function sendMessage(message: string, threadId?: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: threadId }),
  })
  return res.json()
}

export async function resumeCheckpoint(threadId: string, decision: Record<string, unknown>): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: threadId, decision }),
  })
  return res.json()
}
