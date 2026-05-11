import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  AgentSummary,
  AudioChartData,
  ChatMessage,
  ChatResponse,
  CheckpointData,
  CheckpointType,
  DirectionData,
  RevisionPlanData,
  SoundChartData,
  StoredVideoArtifact,
  TargetSelectionData,
  ValidationReportData,
  VariantPlanData,
} from "./types"
import { client, createThread, fetchConfigs, fetchJobStatus, fetchLatestRender } from "./api"
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
  getActiveVideoTarget,
  getVideoArtifacts,
  saveVideoArtifact,
  setActiveVideoTarget,
  type StoredThread,
} from "./lib/threadStorage"
import { stripTargetMetadata } from "./lib/targetMetadata"

function artifactFromCompletedJob(job: {
  id: string
  config_id: string | null
  title: string | null
  composition: string
}): StoredVideoArtifact {
  return {
    id: job.id,
    configPath: `.generated/renders/${job.id}/config.json`,
    configId: job.config_id ?? undefined,
    jobId: job.id,
    composition: job.composition,
    title: job.title ?? job.config_id ?? job.id,
    createdAt: new Date().toISOString(),
  }
}

function artifactFromConfig(config: {
  configPath: string
  configId?: string
  title?: string
  composition?: string
  sceneCount?: number
  durationSeconds?: number
}): StoredVideoArtifact {
  return {
    id: config.configPath,
    configPath: config.configPath,
    configId: config.configId,
    composition: config.composition,
    title: config.title ?? config.configId ?? config.configPath,
    createdAt: new Date().toISOString(),
    sceneCount: config.sceneCount,
    durationSeconds: config.durationSeconds,
  }
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [threadId, setThreadId] = useState<string | undefined>(() => getCurrentThreadId() ?? undefined)
  const [storedThreads, setStoredThreads] = useState<StoredThread[]>(() => getThreads())
  const [videoArtifacts, setVideoArtifacts] = useState<StoredVideoArtifact[]>(() => getVideoArtifacts())
  const [activeTarget, setActiveTargetState] = useState(() => getActiveVideoTarget())
  const activeTargetRef = useRef(activeTarget)
  activeTargetRef.current = activeTarget
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

  useEffect(() => {
    const allArtifacts = [
      ...stream.streamState.artifacts,
      ...stream.streamState.completedAgents.flatMap((a) => a.artifacts),
    ]
    const decision = allArtifacts.find((a) => a.kind === "intent_decision")
    if (decision?.data?.mode && !pipeline.state.mode) {
      pipeline.setMode(decision.data.mode as Parameters<typeof pipeline.setMode>[0])
    }
  }, [stream.streamState.artifacts, stream.streamState.completedAgents, pipeline])

  useEffect(() => {
    fetchConfigs()
      .then((response) => {
        const existing = getVideoArtifacts()
        const fromConfigs = response.configs
          .filter((config) => !config.error)
          .map((config) => artifactFromConfig(config))
        const merged = [...existing]
        for (const artifact of fromConfigs) {
          if (!merged.some((item) => item.configPath === artifact.configPath)) merged.push(artifact)
        }
        setVideoArtifacts(merged)
      })
      .catch((err) => console.warn("[init] fetchConfigs failed:", err))
  }, [])

  const handleNewThread = useCallback(() => {
    setThreadId(undefined)
    setCurrentThreadId(null)
    setMessages([])
    stream.resetStream()
    pipeline.reset()
  }, [stream, pipeline])

  const handleSelectTarget = useCallback((target: StoredVideoArtifact | null) => {
    setActiveVideoTarget(target)
    setActiveTargetState(target)
  }, [])

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
            stripTargetMetadata(typeof m.content === "string" ? m.content : JSON.stringify(m.content)),
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
      } else if (cpType === "target_selection_checkpoint") {
        pipeline.advance("orchestrator", "Seleccion de target requerida")
        addMessage(
          "assistant",
          "Necesito que elijas el config objetivo:",
          res.data as TargetSelectionData,
          "target_selection",
        )
      } else if (cpType === "revision_plan_checkpoint") {
        pipeline.advance("escaleta_review", "Plan de revision preparado")
        addMessage("assistant", "He preparado un plan de revision:", res.data as RevisionPlanData, "revision_plan")
      } else if (cpType === "variant_plan_checkpoint") {
        pipeline.advance("escaleta_review", "Plan de variante preparado")
        addMessage("assistant", "He preparado un plan de variante:", res.data as VariantPlanData, "variant_plan")
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
              const artifact = artifactFromCompletedJob(job)
              saveVideoArtifact(artifact)
              setVideoArtifacts(getVideoArtifacts())
              setActiveVideoTarget(artifact)
              setActiveTargetState(artifact)
              addMessage(
                "assistant",
                "Video listo:",
                { jobId: job.id, title: job.title, fileSize: job.file_size, target: artifact },
                "video_result",
              )
            }
          })
          .catch((err) => console.warn("[auto-lookup] fetchJobStatus failed:", err))
      } else if (activeTargetRef.current?.configId) {
        const targetConfigId = activeTargetRef.current.configId
        fetchLatestRender(targetConfigId)
          .then((job) => {
            if (job) {
              addMessage(
                "assistant",
                "Video listo:",
                { jobId: job.id, title: job.title, fileSize: job.file_size },
                "video_result",
              )
            } else {
              const targetTitle = activeTargetRef.current?.title || targetConfigId
              addMessage(
                "assistant",
                `No hay un video renderizado para **${targetTitle}**. Puedes usar "Renderiza otra vez" para generar uno, o pedir que se regeneren los recursos de audio primero.`,
              )
            }
          })
          .catch((err) => console.warn("[auto-lookup] fetchLatestRender failed:", err))
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
      stream.startStream(tid, text, activeTarget)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pipeline.advance("error", message)
      addMessage("assistant", `No he podido conectar con el backend: ${message}`)
    }
  }

  const createCheckpointHandlers = useCallback(
    (approvedMessage: string, feedbackPrefix: string) => ({
      onApprove: (payload?: Record<string, unknown>) => {
        if (!threadId || stream.isStreaming) return
        addMessage("user", approvedMessage)
        stream.resumeStream(threadId, { approved: true, ...payload })
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
      target_selection: createCheckpointHandlers("Target seleccionado", "Seleccion de target"),
      revision_plan: createCheckpointHandlers("Plan aprobado", "Ajustes del plan"),
      variant_plan: createCheckpointHandlers("Variante aprobada", "Ajustes de variante"),
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
          mode={pipeline.state.mode}
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
          <Header artifacts={videoArtifacts} activeTarget={activeTarget} onSelectTarget={handleSelectTarget} />
          <ChatThread
            messages={messages}
            streamState={stream.streamState}
            checkpointHandlers={checkpointHandlers}
            loading={stream.isStreaming}
            loadingLabel={pipeline.getLoadingLabel()}
            onRetry={stream.clearError}
            currentStage={pipeline.state.currentStage}
          />
          <InputBar
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={stream.isStreaming}
            activeTarget={activeTarget}
          />
        </>
      }
    />
  )
}
