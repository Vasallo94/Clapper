import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  AgentSummary,
  AudioChartData,
  ChatMessage,
  ChatResponse,
  CheckpointData,
  CheckpointType,
  DirectionData,
  SoundChartData,
  ValidationReportData,
} from "./types"
import { client, createThread, fetchJobStatus } from "./api"
import { useAgentStream } from "./hooks/useAgentStream"
import { usePipelineTracker } from "./hooks/usePipelineTracker"
import { AppLayout } from "./components/AppLayout"
import { Sidebar } from "./components/Sidebar"
import { Header } from "./components/Header"
import { ChatThread } from "./components/ChatThread"
import { InputBar } from "./components/InputBar"
import {
  getThreads,
  saveThread,
  removeThread,
  getCurrentThreadId,
  setCurrentThreadId,
  type StoredThread,
} from "./lib/threadStorage"

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [threadId, setThreadId] = useState<string | undefined>(() => getCurrentThreadId() ?? undefined)
  const [storedThreads, setStoredThreads] = useState<StoredThread[]>(() => getThreads())
  const pipeline = usePipelineTracker()

  const handleAgentComplete = useCallback((summary: AgentSummary) => {
    if (summary.tools.length === 0 && summary.artifacts.length === 0 && !summary.llmText?.trim()) return
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

  const handleNewThread = useCallback(() => {
    setThreadId(undefined)
    setCurrentThreadId(null)
    setMessages([])
    stream.resetStream()
    pipeline.reset()
  }, [stream, pipeline])

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

  const handleSelectThread = useCallback(
    async (tid: string) => {
      setThreadId(tid)
      setCurrentThreadId(tid)
      setMessages([])
      stream.resetStream()
      pipeline.reset()
      try {
        const state = await client.threads.getState(tid)
        const msgs =
          ((state.values as Record<string, unknown>)?.messages as Array<{ type: string; content: string }>) ?? []
        for (const m of msgs) {
          addMessage(
            m.type === "human" ? "user" : "assistant",
            typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          )
        }
      } catch {
        removeThread(tid)
        setStoredThreads(getThreads())
      }
    },
    [addMessage, stream, pipeline],
  )

  const handleDeleteThread = useCallback(
    (tid: string) => {
      removeThread(tid)
      setStoredThreads(getThreads())
      if (tid === threadId) handleNewThread()
    },
    [threadId, handleNewThread],
  )

  const lastProcessedResult = useRef<ChatResponse | null>(null)
  const lastProcessedError = useRef<string | null>(null)

  useEffect(() => {
    if (!stream.result || stream.result === lastProcessedResult.current) return
    lastProcessedResult.current = stream.result
    const res = stream.result
    setThreadId(res.thread_id)

    if (res.type === "checkpoint" && res.data) {
      const cpType = (res.data as unknown as Record<string, unknown>).type as string
      if (cpType === "sound_chart_checkpoint") {
        pipeline.advance("sound_review", "Carta de sonido generada")
        addMessage(
          "assistant",
          "He preparado una propuesta de carta de sonido:",
          res.data as SoundChartData,
          "sound_chart",
        )
      } else if (cpType === "audio_chart_checkpoint") {
        pipeline.advance("sound_review", "Carta de audio generada")
        addMessage(
          "assistant",
          "He preparado una propuesta de audio y guion:",
          res.data as AudioChartData,
          "audio_chart",
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
      } else if (cpType === "validation_report") {
        pipeline.advance("rendering", "Validacion generada")
        addMessage("assistant", "Resultado de validacion:", res.data as ValidationReportData, "validation")
      } else {
        pipeline.advance("escaleta_review", `Checkpoint: ${cpType}`)
        addMessage(
          "assistant",
          `Checkpoint recibido (${cpType}):`,
          res.data as unknown as Record<string, unknown>,
          "generic",
        )
      }
    } else if (res.type === "message") {
      const content = res.content?.trim() || "Proceso completado."
      pipeline.advance("done", "Pipeline completado")
      addMessage("assistant", content)

      const jobIdMatch = content.match(/jobId[:\s]*["']?([a-f0-9-]+)["']?/i)
      if (jobIdMatch) {
        fetchJobStatus(jobIdMatch[1])
          .then((job) => {
            if (job.status === "done") {
              addMessage(
                "assistant",
                "Video listo:",
                { jobId: job.id, title: job.title, fileSize: job.file_size },
                "video_result",
              )
            }
          })
          .catch(() => {})
      }
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

    try {
      const tid = await resolveThreadForSend(text)
      stream.startStream(tid, text)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pipeline.advance("error", message)
      addMessage("assistant", `No he podido conectar con el backend: ${message}`)
    }
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
      audio_chart: createCheckpointHandlers("Audio aprobado", "Ajustes de audio"),
      validation: createCheckpointHandlers("Validacion aprobada", "Ajustes de validacion"),
      generic: createCheckpointHandlers("Aprobado", "Cambios"),
    }),
    [createCheckpointHandlers],
  )

  const resolveThreadForSend = useCallback(
    async (initialMessage: string) => {
      if (threadId) {
        try {
          await client.threads.getState(threadId)
          return threadId
        } catch {
          removeThread(threadId)
          setStoredThreads(getThreads())
          setCurrentThreadId(null)
          setThreadId(undefined)
        }
      }

      const tid = await createThread()
      setThreadId(tid)
      setCurrentThreadId(tid)
      saveThread({
        threadId: tid,
        title: initialMessage.slice(0, 60),
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      })
      setStoredThreads(getThreads())
      return tid
    },
    [threadId],
  )

  return (
    <AppLayout
      sidebar={
        <Sidebar
          currentStage={pipeline.state.currentStage}
          events={pipeline.state.events}
          threads={storedThreads}
          currentThreadId={threadId}
          onSelectThread={handleSelectThread}
          onDeleteThread={handleDeleteThread}
          onNewThread={handleNewThread}
        />
      }
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
