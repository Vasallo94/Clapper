export type MessageRole = "user" | "assistant" | "agent"
export type CheckpointType =
  | "escaleta"
  | "direction"
  | "sound_chart"
  | "audio_chart"
  | "validation"
  | "target_selection"
  | "revision_plan"
  | "variant_plan"
  | "generic"
  | "video_result"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  checkpoint?:
    | CheckpointData
    | SoundChartData
    | AudioChartData
    | DirectionData
    | ValidationReportData
    | TargetSelectionData
    | RevisionPlanData
    | VariantPlanData
    | Record<string, unknown>
  checkpointType?: CheckpointType
  agentSummary?: AgentSummary
}

export interface ToolEntry {
  id: string
  toolCallId?: string
  name: string
  input?: string
  output?: string
  namespace?: string[]
  status: "running" | "done" | "error"
  startedAt: number
}

export interface AgentSummary {
  id?: string
  name: string
  tools: ToolEntry[]
  artifacts: AgentArtifact[]
  llmText?: string
  durationMs: number
  startedAt: number
}

export type AgentArtifactKind = "validation" | "script" | "audio_chart" | "intent_decision" | "tool_output"

export interface AgentArtifact {
  id: string
  kind: AgentArtifactKind
  title: string
  source?: string
  content?: string
  data?: Record<string, unknown>
  createdAt: number
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
  data?:
    | CheckpointData
    | SoundChartData
    | AudioChartData
    | DirectionData
    | ValidationReportData
    | TargetSelectionData
    | RevisionPlanData
    | VariantPlanData
  thread_id: string
}

export interface IntentDecisionData {
  mode: string
  confidence?: number
  requires_target?: boolean
  target?: ActiveVideoTarget | null
  agent_scope?: string[]
  forbidden_agents?: string[]
  requires_checkpoint?: boolean
  can_write_files?: boolean
  can_render?: boolean
  rationale?: string
  missing_target?: boolean
  checkpoints?: string[]
}

export interface TargetSelectionData {
  type: "target_selection_checkpoint"
  mode: string
  candidates: Array<ActiveVideoTarget & { sceneCount?: number; durationSeconds?: number; error?: string }>
}

export interface RevisionPlanData {
  type: "revision_plan_checkpoint"
  target: Record<string, unknown>
  requestedChanges: string[]
  proposedEdits: string[]
  willRender?: boolean
}

export interface VariantPlanData {
  type: "variant_plan_checkpoint"
  source: Record<string, unknown>
  variant: Record<string, unknown>
  proposedChanges: string[]
  willRender?: boolean
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

export interface AudioChartData {
  type: "audio_chart_checkpoint"
  voiceover?: Record<string, unknown>
  sound_design?: Record<string, unknown>
}

export interface ValidationReportData {
  type: "validation_report"
  errors: string[]
  warnings: string[]
  recommendations: string[]
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

export interface ActiveVideoTarget {
  configPath: string
  configId?: string
  jobId?: string
  composition?: string
  title?: string
}

export interface StoredVideoArtifact extends ActiveVideoTarget {
  id: string
  createdAt: string
  sceneCount?: number
  durationSeconds?: number
}

export interface ConfigListResponse {
  configs: Array<ActiveVideoTarget & { sceneCount?: number; durationSeconds?: number; error?: string }>
}
