import { useCallback, useState } from "react"
import type { PipelineEvent, PipelineStageId } from "../types"

export interface PipelineState {
  currentStage: PipelineStageId
  events: PipelineEvent[]
  startedAt: Date | null
}

const INITIAL_STATE: PipelineState = {
  currentStage: "idle",
  events: [],
  startedAt: null,
}

const AGENT_TO_STAGE: Record<string, PipelineStageId> = {
  orchestrator: "orchestrator",
  researcher: "researcher",
  copywriter: "copywriter",
  director: "director",
  audio_planner: "sound_engineer",
  voice_generator: "sound_engineer",
  sound_engineer: "sound_engineer",
  validator: "rendering",
  reviewer: "rendering",
}

export function usePipelineTracker() {
  const [state, setState] = useState<PipelineState>(INITIAL_STATE)

  const addEvent = useCallback((stage: PipelineStageId, message: string, type: PipelineEvent["type"] = "info") => {
    const event: PipelineEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      stage,
      message,
      type,
    }
    setState((prev) => ({ ...prev, events: [...prev.events, event] }))
  }, [])

  const advance = useCallback((stage: PipelineStageId, message: string) => {
    const type: PipelineEvent["type"] =
      stage === "error" ? "error" : stage === "done" ? "success" : stage.endsWith("_review") ? "checkpoint" : "info"
    setState((prev) => ({
      ...prev,
      currentStage: stage,
      startedAt: prev.startedAt ?? new Date(),
      events: [...prev.events, { id: crypto.randomUUID(), timestamp: new Date(), stage, message, type }],
    }))
  }, [])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  const advanceFromStream = useCallback(
    (agentName: string) => {
      const stage = AGENT_TO_STAGE[agentName]
      if (stage && stage !== state.currentStage) {
        advance(stage, `${agentName} trabajando...`)
      }
    },
    [state.currentStage, advance],
  )

  const getLoadingLabel = useCallback((): string => {
    switch (state.currentStage) {
      case "orchestrator":
        return "Planificando pipeline..."
      case "researcher":
        return "Investigando mercado y competencia..."
      case "copywriter":
        return "Escribiendo guion..."
      case "director":
        return "Dirigiendo escenas..."
      case "sound_engineer":
        return "Disenando sonido..."
      case "rendering":
        return "Renderizando video..."
      default:
        return "Procesando..."
    }
  }, [state.currentStage])

  return { state, advance, advanceFromStream, addEvent, reset, getLoadingLabel }
}
