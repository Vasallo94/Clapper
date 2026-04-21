export type MessageRole = "user" | "assistant"
export type CheckpointType = "escaleta" | "sound_chart"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  checkpoint?: CheckpointData | SoundChartData
  checkpointType?: CheckpointType
}

export interface CheckpointData {
  type: string
  brief: Record<string, string>
  scenes: ScenePreview[]
}

export interface ScenePreview {
  type: string
  title?: string
  text?: string
  durationInSeconds: number
  [key: string]: unknown
}

export interface ChatResponse {
  type: "message" | "checkpoint"
  content?: string
  data?: CheckpointData | SoundChartData
  thread_id: string
}

export interface SoundChartData {
  type: "sound_chart_checkpoint"
  music_bed: {
    libraryId?: string
    volume: number
    duckingVolume: number
  }
  sfx_entries: Array<{
    id: string
    prompt: string
    trigger: string
    sceneTypes?: string[]
    volume: number
    loop?: boolean
  }>
}

export type PipelineStageId =
  | "idle"
  | "orchestrator"
  | "researcher"
  | "copywriter"
  | "escaleta_review"
  | "director"
  | "sound_engineer"
  | "sound_review"
  | "rendering"
  | "done"
  | "error"

export interface PipelineEvent {
  id: string
  timestamp: Date
  stage: PipelineStageId
  message: string
  type: "info" | "checkpoint" | "success" | "error"
}
