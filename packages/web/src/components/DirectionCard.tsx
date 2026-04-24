import { useState } from "react"
import type { DirectionData } from "../types"
import { theme } from "../theme"
import { btnStyle } from "./btnStyle"

interface Props {
  data: DirectionData
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
  disabled?: boolean
}

export function DirectionCard({ data, onApprove, onRequestChanges, disabled }: Props) {
  const [feedback, setFeedback] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <div
      className="animate-card-reveal"
      style={{
        border: `1px solid ${theme.colors.border.accent}`,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        margin: "12px 0",
        backgroundColor: theme.colors.bg.elevated,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 18, backgroundColor: theme.colors.accent.primary, borderRadius: 2 }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.colors.text.primary }}>
          Direccion editorial
        </h3>
      </div>

      <div style={{ fontSize: 13, color: theme.colors.text.secondary, marginBottom: 12 }}>
        {data.scenes.length} escenas con timing y beats narrativos
      </div>

      {data.warnings.length > 0 && (
        <div
          style={{
            padding: "10px 12px",
            backgroundColor: theme.colors.status.warning + "14",
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.status.warning + "33"}`,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: theme.colors.status.warning,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Avisos del director
          </div>
          {data.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4, lineHeight: 1.5 }}>
              - {w}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onApprove} disabled={disabled} style={btnStyle(theme.colors.status.success, disabled)}>
          Aprobar
        </button>
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          disabled={disabled}
          style={btnStyle(theme.colors.status.warning, disabled)}
        >
          Pedir cambios
        </button>
      </div>

      {showFeedback && (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe los ajustes de timing o ritmo..."
            style={{
              width: "100%",
              padding: 10,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.border.default}`,
              backgroundColor: theme.colors.bg.primary,
              color: theme.colors.text.primary,
              fontSize: 13,
              minHeight: 60,
              resize: "vertical",
              fontFamily: theme.fonts.sans,
            }}
          />
          <button
            onClick={() => {
              onRequestChanges(feedback)
              setFeedback("")
              setShowFeedback(false)
            }}
            disabled={disabled || !feedback.trim()}
            style={{ ...btnStyle(theme.colors.accent.primary, disabled || !feedback.trim()), marginTop: 6 }}
          >
            Enviar feedback
          </button>
        </div>
      )}
    </div>
  )
}
