import { useCallback, useEffect, useRef, useState } from "react"
import type { AgentStreamStatus, CheckpointData, SoundChartData, StreamEvent } from "../types"

const API_BASE = "http://localhost:8000"

interface AgentStreamState {
  events: StreamEvent[]
  activeAgent: string | null
  checkpoint: CheckpointData | SoundChartData | null
  checkpointType: string | null
  renderProgress: number
  status: AgentStreamStatus
  error: string | null
}

export function useAgentStream(threadId: string | null) {
  const [state, setState] = useState<AgentStreamState>({
    events: [],
    activeAgent: null,
    checkpoint: null,
    checkpointType: null,
    renderProgress: 0,
    status: "idle",
    error: null,
  })

  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!threadId) return
    const es = new EventSource(`${API_BASE}/api/chat/${threadId}/stream`)
    eventSourceRef.current = es
    setState((prev) => ({ ...prev, status: "streaming" }))

    es.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data)
        setState((prev) => {
          const next = { ...prev, events: [...prev.events, data] }
          switch (data.type) {
            case "agent_status":
              next.activeAgent = data.agent ?? null
              break
            case "escaleta_checkpoint":
              next.checkpoint = data.data as CheckpointData
              next.checkpointType = "escaleta"
              next.status = "checkpoint"
              next.activeAgent = null
              break
            case "sound_chart_checkpoint":
              next.checkpoint = data.data as SoundChartData
              next.checkpointType = "sound_chart"
              next.status = "checkpoint"
              next.activeAgent = null
              break
            case "render_progress":
              next.renderProgress = data.progress ?? 0
              break
            case "done":
              next.status = "done"
              next.activeAgent = null
              break
            case "error":
              next.status = "error"
              next.error = data.message ?? "Unknown error"
              next.activeAgent = null
              break
          }
          return next
        })
      } catch {
        // Ignore malformed events
      }
    }

    es.onerror = () => {
      es.close()
      setState((prev) => {
        if (prev.status === "streaming") {
          return { ...prev, status: "error", error: "Connection lost" }
        }
        return prev
      })
    }
  }, [threadId])

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
  }, [])

  const reset = useCallback(() => {
    disconnect()
    setState({
      events: [],
      activeAgent: null,
      checkpoint: null,
      checkpointType: null,
      renderProgress: 0,
      status: "idle",
      error: null,
    })
  }, [disconnect])

  useEffect(() => {
    return () => disconnect()
  }, [disconnect])

  return { ...state, connect, disconnect, reset }
}
