import type { PipelineStageId } from "../types"
import { theme } from "../theme"

const STEPS: { id: PipelineStageId; label: string }[] = [
  { id: "researcher", label: "Investigacion" },
  { id: "copywriter", label: "Guion" },
  { id: "director", label: "Direccion" },
  { id: "sound_engineer", label: "Sonido" },
  { id: "rendering", label: "Render" },
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

function getStepStatus(stepId: PipelineStageId, currentStage: PipelineStageId): "pending" | "active" | "completed" {
  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  const stepIdx = STAGE_ORDER.indexOf(stepId)
  if (currentStage === "error") return stepIdx < currentIdx ? "completed" : "pending"
  if (stepIdx < currentIdx) return "completed"
  if (stepId === currentStage) return "active"
  // escaleta_review means copywriter is completed
  if (stepId === "copywriter" && currentStage === "escaleta_review") return "completed"
  // sound_review means sound_engineer is completed
  if (stepId === "sound_engineer" && currentStage === "sound_review") return "completed"
  return "pending"
}

export function PipelineStepper({ currentStage }: { currentStage: PipelineStageId }) {
  return (
    <div style={{ padding: "0 4px" }}>
      {STEPS.map((step, i) => {
        const status = getStepStatus(step.id, currentStage)
        const isLast = i === STEPS.length - 1
        const dotColor =
          status === "completed"
            ? theme.colors.status.success
            : status === "active"
              ? theme.colors.accent.primary
              : theme.colors.text.muted
        const lineColor = status === "completed" ? theme.colors.status.success : theme.colors.border.default

        return (
          <div key={step.id} style={{ display: "flex", gap: 12 }}>
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
