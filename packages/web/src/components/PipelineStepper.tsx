import type { PipelineStageId } from "../types"
import type { PipelineMode } from "../hooks/usePipelineTracker"
import { theme } from "../theme"

interface StepDef {
  id: PipelineStageId
  label: string
  covers: PipelineStageId[]
}

const STEPS_NEW_VIDEO: StepDef[] = [
  { id: "researcher", label: "Investigacion", covers: ["orchestrator", "researcher"] },
  { id: "copywriter", label: "Guion", covers: ["copywriter", "escaleta_review"] },
  { id: "director", label: "Direccion", covers: ["director"] },
  { id: "sound_engineer", label: "Sonido", covers: ["sound_engineer", "sound_review"] },
  { id: "rendering", label: "Render", covers: ["rendering"] },
]

const STEPS_REVISE: StepDef[] = [
  { id: "orchestrator", label: "Cargando config", covers: ["orchestrator"] },
  { id: "escaleta_review", label: "Plan de revision", covers: ["escaleta_review"] },
  { id: "director", label: "Editando", covers: ["copywriter", "director", "sound_engineer", "sound_review"] },
  { id: "rendering", label: "Validacion y render", covers: ["rendering"] },
]

const STEPS_RENDER_ONLY: StepDef[] = [
  { id: "orchestrator", label: "Validacion", covers: ["orchestrator", "rendering"] },
  { id: "rendering", label: "Render", covers: ["rendering"] },
]

const STEPS_RECOVER: StepDef[] = [
  { id: "orchestrator", label: "Diagnostico", covers: ["orchestrator"] },
  { id: "escaleta_review", label: "Reparacion", covers: ["escaleta_review", "copywriter", "director"] },
  { id: "rendering", label: "Validacion y render", covers: ["rendering"] },
]

const STEPS_AUDIT: StepDef[] = [
  {
    id: "orchestrator",
    label: "Analizando",
    covers: [
      "orchestrator",
      "researcher",
      "copywriter",
      "director",
      "escaleta_review",
      "sound_engineer",
      "sound_review",
      "rendering",
    ],
  },
]

const STEPS_VARIANT: StepDef[] = [
  { id: "orchestrator", label: "Cargando config", covers: ["orchestrator"] },
  { id: "escaleta_review", label: "Plan de variante", covers: ["escaleta_review"] },
  { id: "director", label: "Generando variante", covers: ["copywriter", "director", "sound_engineer", "sound_review"] },
  { id: "rendering", label: "Validacion y render", covers: ["rendering"] },
]

const STEPS_ASSET_REGEN: StepDef[] = [
  { id: "orchestrator", label: "Cargando config", covers: ["orchestrator"] },
  { id: "sound_engineer", label: "Regenerando assets", covers: ["sound_engineer", "sound_review"] },
  { id: "rendering", label: "Validacion", covers: ["rendering"] },
]

const STEPS_QUESTION: StepDef[] = [
  {
    id: "orchestrator",
    label: "Procesando",
    covers: [
      "orchestrator",
      "researcher",
      "copywriter",
      "director",
      "escaleta_review",
      "sound_engineer",
      "sound_review",
      "rendering",
    ],
  },
]

const MODE_STEPS: Record<PipelineMode, StepDef[]> = {
  new_video: STEPS_NEW_VIDEO,
  revise_existing: STEPS_REVISE,
  render_only: STEPS_RENDER_ONLY,
  recover_failed_render: STEPS_RECOVER,
  audit_only: STEPS_AUDIT,
  variant: STEPS_VARIANT,
  asset_regeneration: STEPS_ASSET_REGEN,
  question: STEPS_QUESTION,
}

const MODE_LABELS: Record<PipelineMode, string> = {
  new_video: "Nuevo video",
  revise_existing: "Revision",
  render_only: "Render",
  recover_failed_render: "Reparacion",
  audit_only: "Auditoria",
  variant: "Variante",
  asset_regeneration: "Regenerar assets",
  question: "Consulta",
}

const STAGE_ORDER: PipelineStageId[] = [
  "idle",
  "orchestrator",
  "researcher",
  "copywriter",
  "escaleta_review",
  "director",
  "sound_engineer",
  "sound_review",
  "rendering",
  "done",
  "error",
]

function getStepStatus(step: StepDef, currentStage: PipelineStageId): "pending" | "active" | "completed" {
  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  const stepIdx = STAGE_ORDER.indexOf(step.id)
  if (currentStage === "idle") return "pending"
  if (currentStage === "done") return "completed"
  if (currentStage === "error") return stepIdx < currentIdx ? "completed" : "pending"
  if (step.covers.includes(currentStage)) return "active"
  if (stepIdx < currentIdx) return "completed"
  return "pending"
}

interface Props {
  currentStage: PipelineStageId
  mode: PipelineMode | null
}

export function PipelineStepper({ currentStage, mode }: Props) {
  const steps = mode ? MODE_STEPS[mode] : STEPS_NEW_VIDEO
  const modeLabel = mode ? MODE_LABELS[mode] : null

  if (currentStage === "idle") {
    return (
      <div style={{ fontSize: 12, color: theme.colors.text.muted, fontStyle: "italic", padding: "4px 0" }}>
        Esperando instrucciones...
      </div>
    )
  }

  return (
    <div>
      {modeLabel && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: theme.colors.accent.primary,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 10,
            fontFamily: theme.fonts.mono,
          }}
        >
          {modeLabel}
        </div>
      )}

      <div role="list" aria-label="Etapas del pipeline" style={{ padding: "0 4px" }}>
        {steps.map((step, i) => {
          const status = getStepStatus(step, currentStage)
          const isLast = i === steps.length - 1
          const dotColor =
            status === "completed"
              ? theme.colors.status.success
              : status === "active"
                ? theme.colors.accent.primary
                : theme.colors.text.muted
          const lineColor = status === "completed" ? theme.colors.status.success : theme.colors.border.default

          return (
            <div
              key={step.id}
              role="listitem"
              aria-current={status === "active" ? "step" : undefined}
              style={{ display: "flex", gap: 12 }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                <div
                  className={status === "active" ? "animate-pulse" : undefined}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: dotColor,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 300ms",
                  }}
                >
                  {status === "completed" && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path
                        d="M1.5 4L3 5.5L6.5 2"
                        stroke="#0D0D0D"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 20,
                      backgroundColor: lineColor,
                      borderRadius: 1,
                      transition: "background-color 300ms",
                    }}
                  />
                )}
              </div>
              <div style={{ paddingBottom: isLast ? 0 : 12, minHeight: 32 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: status === "active" ? 600 : 400,
                    color: status === "pending" ? theme.colors.text.muted : theme.colors.text.primary,
                    lineHeight: "12px",
                    transition: "color 300ms",
                  }}
                >
                  {step.label}
                </div>
                {status === "active" && (
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.colors.accent.primary,
                      marginTop: 3,
                      fontFamily: theme.fonts.mono,
                    }}
                  >
                    en curso...
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {currentStage === "done" && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: 8,
              padding: "6px 10px",
              borderRadius: theme.radius.sm,
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: `1px solid rgba(34, 197, 94, 0.3)`,
            }}
          >
            <div style={{ fontSize: 12, color: theme.colors.status.success, fontWeight: 500 }}>Completado</div>
          </div>
        )}

        {currentStage === "error" && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: 8,
              padding: "6px 10px",
              borderRadius: theme.radius.sm,
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: `1px solid rgba(239, 68, 68, 0.3)`,
            }}
          >
            <div style={{ fontSize: 12, color: theme.colors.status.error, fontWeight: 500 }}>Error</div>
          </div>
        )}
      </div>
    </div>
  )
}
