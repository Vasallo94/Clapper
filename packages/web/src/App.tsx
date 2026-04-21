import { useState } from "react"
import type { ChatMessage, CheckpointData, CheckpointType, SoundChartData } from "./types"
import { resumeCheckpoint, sendMessage } from "./api"
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
  const [loading, setLoading] = useState(false)
  const pipeline = usePipelineTracker()

  const addMessage = (
    role: ChatMessage["role"],
    content: string,
    checkpoint?: CheckpointData | SoundChartData,
    checkpointType?: CheckpointType,
  ) => {
    const id = crypto.randomUUID()
    setMessages((prev) => [...prev, { id, role, content, checkpoint, checkpointType }])
    return id
  }

  const handleResponse = (res: Awaited<ReturnType<typeof sendMessage>>) => {
    setThreadId(res.thread_id)
    if (res.type === "checkpoint" && res.data) {
      const isSoundChart = (res.data as SoundChartData).type === "sound_chart_checkpoint"
      if (isSoundChart) {
        pipeline.advance("sound_review", "Carta de sonido generada")
        addMessage(
          "assistant",
          "He preparado una propuesta de carta de sonido:",
          res.data as SoundChartData,
          "sound_chart",
        )
      } else {
        pipeline.advance("escaleta_review", "Escaleta generada")
        addMessage("assistant", "He preparado una propuesta de escaleta:", res.data as CheckpointData, "escaleta")
      }
    } else {
      const content = res.content?.trim() || "Proceso completado."
      pipeline.advance("done", "Pipeline completado")
      addMessage("assistant", content)
    }
  }

  const handleError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    pipeline.advance("error", msg)
    addMessage("assistant", `Error: ${msg}`)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    addMessage("user", text)
    pipeline.reset()
    pipeline.advance("orchestrator", "Mensaje recibido: " + text.slice(0, 60))
    pipeline.advance("researcher", "Investigando...")
    setLoading(true)

    try {
      const res = await sendMessage(text, threadId)
      handleResponse(res)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!threadId || loading) return
    addMessage("user", "Aprobado")
    pipeline.advance("director", "Escaleta aprobada. Director trabajando...")
    setLoading(true)

    try {
      const res = await resumeCheckpoint(threadId, { approved: true })
      handleResponse(res)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestChanges = async (feedback: string) => {
    if (!threadId || loading) return
    addMessage("user", `Cambios solicitados: ${feedback}`)
    pipeline.advance("copywriter", "Revisando escaleta con feedback...")
    setLoading(true)

    try {
      const res = await resumeCheckpoint(threadId, { approved: false, feedback })
      handleResponse(res)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSoundApprove = async () => {
    if (!threadId || loading) return
    addMessage("user", "Sonido aprobado")
    pipeline.advance("rendering", "Generando audio y renderizando...")
    setLoading(true)

    try {
      const res = await resumeCheckpoint(threadId, { approved: true })
      handleResponse(res)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSoundRequestChanges = async (feedback: string) => {
    if (!threadId || loading) return
    addMessage("user", `Ajustes de sonido: ${feedback}`)
    pipeline.advance("sound_engineer", "Revisando carta de sonido...")
    setLoading(true)

    try {
      const res = await resumeCheckpoint(threadId, { approved: false, feedback })
      handleResponse(res)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout
      sidebar={<Sidebar currentStage={pipeline.state.currentStage} events={pipeline.state.events} />}
      main={
        <>
          <Header />
          <ChatThread
            messages={messages}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
            onSoundApprove={handleSoundApprove}
            onSoundRequestChanges={handleSoundRequestChanges}
            loading={loading}
            loadingLabel={pipeline.getLoadingLabel()}
          />
          <InputBar value={input} onChange={setInput} onSend={handleSend} disabled={loading} />
        </>
      }
    />
  )
}
