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
