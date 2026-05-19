export interface PlanStep {
  id: string
  owner: string
  title: string
  status: "pending" | "in_progress" | "completed" | "blocked" | "skipped" | "failed"
  summary: string
  artifactPaths: string[]
  blockers: string[]
}

export interface PlanState {
  mode: string
  goal: string
  status: string
  steps: PlanStep[]
  currentStepId: string | null
  progress: { completed: number; total: number }
}

const STEP_LABELS: Record<string, string> = {
  research: "Investigacion",
  copywriting: "Guion",
  draft_validation: "Validacion borrador",
  direction: "Direccion",
  scene_qa: "QA visual",
  audio_plan: "Plan de audio",
  voice_generation: "Voces",
  sound_assets: "Sonido",
  scene_creation: "Escenas custom",
  final_validation: "Validacion final",
  render: "Render",
  review: "Revision",
  target_staging: "Cargando config",
  target_loading: "Cargando config",
  source_staging: "Cargando config",
  revision_plan: "Plan de revision",
  revision: "Editando",
  validation: "Validacion",
  save: "Guardando",
  recovery_plan: "Plan de reparacion",
  repair: "Reparando",
  audit: "Auditoria",
  report: "Informe",
  variant_plan: "Plan de variante",
  variant_creation: "Generando variante",
  asset_plan: "Plan de assets",
  asset_generation: "Regenerando assets",
  answer: "Procesando",
}

const MODE_LABELS: Record<string, string> = {
  new_video: "Nuevo video",
  revise_existing: "Revision",
  render_only: "Render",
  recover_failed_render: "Reparacion",
  audit_only: "Auditoria",
  variant: "Variante",
  asset_regeneration: "Regenerar assets",
  question: "Consulta",
}

export function stepLabel(step: PlanStep): string {
  return STEP_LABELS[step.id] ?? step.title
}

export function modeLabel(mode: string): string {
  return MODE_LABELS[mode] ?? mode
}

export function extractPlanState(values: Record<string, unknown> | undefined): PlanState | null {
  if (!values) return null

  const files = values.files as Record<string, { content: string }> | undefined
  if (!files) return null

  const planFile = files["/pipeline/plan.json"]
  if (!planFile?.content) return null

  try {
    const raw = JSON.parse(typeof planFile.content === "string" ? planFile.content : "")
    const steps: PlanStep[] = (raw.steps ?? []).map((s: Record<string, unknown>) => ({
      id: String(s.id ?? ""),
      owner: String(s.owner ?? ""),
      title: String(s.title ?? ""),
      status: s.status ?? "pending",
      summary: String(s.summary ?? ""),
      artifactPaths: Array.isArray(s.artifactPaths) ? s.artifactPaths : [],
      blockers: Array.isArray(s.blockers) ? s.blockers : [],
    }))

    let completed = 0
    let inProgress: PlanStep | undefined
    let nextPending: PlanStep | undefined
    for (const s of steps) {
      if (s.status === "completed" || s.status === "skipped") completed++
      else if (s.status === "in_progress" && !inProgress) inProgress = s
      else if (s.status === "pending" && !nextPending) nextPending = s
    }

    return {
      mode: String(raw.mode ?? ""),
      goal: String(raw.goal ?? ""),
      status: String(raw.status ?? "active"),
      steps,
      currentStepId: inProgress?.id ?? nextPending?.id ?? null,
      progress: { completed, total: steps.length },
    }
  } catch {
    return null
  }
}

export function loadingLabelFromPlan(plan: PlanState | null): string {
  if (!plan) return "Procesando..."
  const current = plan.steps.find((s) => s.status === "in_progress")
  if (current) return `${stepLabel(current)}...`
  return "Procesando..."
}

export function isRenderingStep(plan: PlanState | null): boolean {
  if (!plan) return false
  return plan.steps.some((s) => s.id === "render" && s.status === "in_progress")
}
