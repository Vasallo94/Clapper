import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  AgentSummary,
  ChatMessage,
  ChatResponse,
  CheckpointData,
  CheckpointType,
  DirectionData,
  SoundChartData,
} from "./types"
import { createThread } from "./api"
import { useAgentStream } from "./hooks/useAgentStream"
import { usePipelineTracker } from "./hooks/usePipelineTracker"
import { AppLayout } from "./components/AppLayout"
import { Sidebar } from "./components/Sidebar"
import { Header } from "./components/Header"
import { ChatThread } from "./components/ChatThread"
import { InputBar } from "./components/InputBar"

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [threadId, setThreadId] = useState<string>()
  const pipeline = usePipelineTracker()

  const handleAgentComplete = useCallback((summary: AgentSummary) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "agent" as const,
        content: summary.name,
        agentSummary: summary,
      },
    ])
  }, [])

  const stream = useAgentStream(pipeline.advanceFromStream, handleAgentComplete)

  const addMessage = useCallback(
    (
      role: ChatMessage["role"],
      content: string,
      checkpoint?: ChatMessage["checkpoint"],
      checkpointType?: CheckpointType,
    ) => {
      const id = crypto.randomUUID()
      setMessages((prev) => [...prev, { id, role, content, checkpoint, checkpointType }])
      return id
    },
    [],
  )

  const lastProcessedResult = useRef<ChatResponse | null>(null)
  const lastProcessedError = useRef<string | null>(null)

  useEffect(() => {
    if (!stream.result || stream.result === lastProcessedResult.current) return
    lastProcessedResult.current = stream.result
    const res = stream.result
    setThreadId(res.thread_id)

    if (res.type === "checkpoint" && res.data) {
      const cpType = (res.data as Record<string, unknown>).type as string
      if (cpType === "sound_chart_checkpoint") {
        pipeline.advance("sound_review", "Carta de sonido generada")
        addMessage(
          "assistant",
          "He preparado una propuesta de carta de sonido:",
          res.data as SoundChartData,
          "sound_chart",
        )
      } else if (cpType === "direction_checkpoint") {
        pipeline.advance("director", "Direccion editorial lista")
        addMessage(
          "assistant",
          "El director ha preparado el timing y beats narrativos:",
          res.data as DirectionData,
          "direction",
        )
      } else if (cpType === "escaleta_checkpoint") {
        pipeline.advance("escaleta_review", "Escaleta generada")
        addMessage("assistant", "He preparado una propuesta de escaleta:", res.data as CheckpointData, "escaleta")
      } else {
        pipeline.advance("escaleta_review", `Checkpoint: ${cpType}`)
        addMessage("assistant", `Checkpoint recibido (${cpType}):`, res.data as Record<string, unknown>, "generic")
      }
    } else if (res.type === "message") {
      const content = res.content?.trim() || "Proceso completado."
      pipeline.advance("done", "Pipeline completado")
      addMessage("assistant", content)
    }
  }, [stream.result, addMessage, pipeline])

  useEffect(() => {
    const err = stream.streamState.error
    if (!err || err === lastProcessedError.current) return
    lastProcessedError.current = err
    pipeline.advance("error", err)
  }, [stream.streamState.error, pipeline])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || stream.isStreaming) return
    setInput("")
    addMessage("user", text)
    stream.resetStream()
    pipeline.reset()
    pipeline.advance("orchestrator", "Mensaje recibido: " + text.slice(0, 60))

    const tid = threadId ?? (await createThread())
    setThreadId(tid)
    stream.startStream(tid, text)
  }

  const createCheckpointHandlers = useCallback(
    (approvedMessage: string, feedbackPrefix: string) => ({
      onApprove: () => {
        if (!threadId || stream.isStreaming) return
        addMessage("user", approvedMessage)
        stream.resumeStream(threadId, { approved: true })
      },
      onRequestChanges: (feedback: string) => {
        if (!threadId || stream.isStreaming) return
        addMessage("user", `${feedbackPrefix}: ${feedback}`)
        stream.resumeStream(threadId, { approved: false, feedback })
      },
    }),
    [threadId, stream, addMessage],
  )

  const checkpointHandlers = useMemo(
    () => ({
      escaleta: createCheckpointHandlers("Aprobado", "Cambios solicitados"),
      direction: createCheckpointHandlers("Direccion aprobada", "Ajustes de direccion"),
      sound_chart: createCheckpointHandlers("Sonido aprobado", "Ajustes de sonido"),
      generic: createCheckpointHandlers("Aprobado", "Cambios"),
    }),
    [createCheckpointHandlers],
  )

  return (
    <AppLayout
      sidebar={<Sidebar currentStage={pipeline.state.currentStage} events={pipeline.state.events} />}
      main={
        <>
          <Header />
          <ChatThread
            messages={messages}
            streamState={stream.streamState}
            checkpointHandlers={checkpointHandlers}
            loading={stream.isStreaming}
            loadingLabel={pipeline.getLoadingLabel()}
            onRetry={stream.clearError}
            currentStage={pipeline.state.currentStage}
          />
          <InputBar value={input} onChange={setInput} onSend={handleSend} disabled={stream.isStreaming} />
        </>
      }
    />
  )
}
