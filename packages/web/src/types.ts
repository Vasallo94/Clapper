export type MessageRole = "user" | "assistant" | "agent"
export type CheckpointType = "escaleta" | "direction" | "sound_chart" | "generic" | "video_result"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  checkpoint?: CheckpointData | SoundChartData | DirectionData | Record<string, unknown>
  checkpointType?: CheckpointType
  agentSummary?: AgentSummary
}

export interface ToolEntry {
  id: string
  name: string
  input?: string
  status: "running" | "done" | "error"
  startedAt: number
}

export interface AgentSummary {
  name: string
  tools: ToolEntry[]
  durationMs: number
  startedAt: number
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

export interface DirectionData {
  type: "direction_checkpoint"
  scenes: Array<Record<string, unknown>>
  warnings: string[]
}

export interface ChatResponse {
  type: "message" | "checkpoint"
  content?: string
  data?: CheckpointData | SoundChartData | DirectionData
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

export interface RenderJob {
  id: string
  config_id: string | null
  title: string | null
  composition: string
  status: string
  progress: number
  output_path: string | null
  file_size: number | null
  thread_id: string | null
  error: string | null
  created_at: string
  completed_at: string | null
}

export interface JobListResponse {
  jobs: RenderJob[]
  total: number
  limit: number
  offset: number
}
