import type { PipelineStageId } from "../types"
import { theme } from "../theme"

const STEPS: { id: PipelineStageId; label: string; covers: PipelineStageId[] }[] = [
  { id: "researcher", label: "Investigacion", covers: ["orchestrator", "researcher"] },
  { id: "copywriter", label: "Guion", covers: ["copywriter", "escaleta_review"] },
  { id: "director", label: "Direccion", covers: ["director"] },
  { id: "sound_engineer", label: "Sonido", covers: ["sound_engineer", "sound_review"] },
  { id: "rendering", label: "Render", covers: ["rendering"] },
]

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

function getStepStatus(
  step: (typeof STEPS)[number],
  currentStage: PipelineStageId,
): "pending" | "active" | "completed" {
  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  const stepIdx = STAGE_ORDER.indexOf(step.id)
  if (currentStage === "idle") return "pending"
  if (currentStage === "done") return "completed"
  if (currentStage === "error") return stepIdx < currentIdx ? "completed" : "pending"
  if (step.covers.includes(currentStage)) return "active"
  if (stepIdx < currentIdx) return "completed"
  return "pending"
}

export function PipelineStepper({ currentStage }: { currentStage: PipelineStageId }) {
  return (
    <div role="list" aria-label="Etapas del pipeline" style={{ padding: "0 4px" }}>
      {STEPS.map((step, i) => {
        const status = getStepStatus(step, currentStage)
        const isLast = i === STEPS.length - 1
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
  )
}
