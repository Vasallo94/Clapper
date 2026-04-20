export type MessageRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  checkpoint?: CheckpointData
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
  data?: CheckpointData
  thread_id: string
}

export type StreamEventType =
  | "agent_status"
  | "escaleta_checkpoint"
  | "sound_chart_checkpoint"
  | "render_progress"
  | "scene_creator_step"
  | "message"
  | "done"
  | "error"

export interface StreamEvent {
  type: StreamEventType
  agent?: string
  status?: string
  data?: CheckpointData | SoundChartData
  progress?: number
  step?: string
  attempt?: number
  message?: string
  content?: string
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

export type AgentStreamStatus = "idle" | "streaming" | "checkpoint" | "done" | "error"
