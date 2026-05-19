import { useCallback, useState } from "react"
import type { PipelineEvent } from "../types"

export interface PipelineTrackerState {
  events: PipelineEvent[]
}

const INITIAL_STATE: PipelineTrackerState = {
  events: [],
}

export function usePipelineTracker() {
  const [state, setState] = useState<PipelineTrackerState>(INITIAL_STATE)

  const addEvent = useCallback((stage: string, message: string, type: PipelineEvent["type"] = "info") => {
    const event: PipelineEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      stage: stage as PipelineEvent["stage"],
      message,
      type,
    }
    setState((prev) => ({ ...prev, events: [...prev.events, event] }))
  }, [])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return { state, addEvent, reset }
}
