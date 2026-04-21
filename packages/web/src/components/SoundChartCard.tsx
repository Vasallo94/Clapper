import { useState } from "react"
import type { SoundChartData } from "../types"
import { theme } from "../theme"

interface Props {
  data: SoundChartData
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
  disabled?: boolean
}

export function SoundChartCard({ data, onApprove, onRequestChanges, disabled }: Props) {
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
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.colors.text.primary }}>Carta de sonido</h3>
      </div>

      {data.music_bed && (
        <div
          style={{
            fontSize: 12,
            color: theme.colors.text.secondary,
            marginBottom: 12,
            padding: "8px 10px",
            backgroundColor: theme.colors.bg.primary,
            borderRadius: theme.radius.sm,
            fontFamily: theme.fonts.mono,
          }}
        >
          <span style={{ color: theme.colors.text.muted }}>music_bed:</span> {data.music_bed.libraryId ?? "custom"}{" "}
          <span style={{ color: theme.colors.text.muted }}>vol:</span> {data.music_bed.volume}dB{" "}
          <span style={{ color: theme.colors.text.muted }}>ducking:</span> {data.music_bed.duckingVolume}dB
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${theme.colors.border.default}` }}>
            {["SFX", "Trigger", "Escenas", "Vol"].map((h, i) => (
              <th
                key={h}
                style={{
                  padding: "6px 8px",
                  textAlign: i === 3 ? "right" : "left",
                  color: theme.colors.text.muted,
                  fontWeight: 500,
                  fontSize: 11,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.05em",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.sfx_entries.map((sfx) => (
            <tr key={sfx.id} style={{ borderBottom: `1px solid ${theme.colors.border.subtle}` }}>
              <td
                style={{
                  padding: "6px 8px",
                  color: theme.colors.accent.primary,
                  fontFamily: theme.fonts.mono,
                  fontSize: 12,
                }}
              >
                {sfx.id}
              </td>
              <td style={{ padding: "6px 8px", color: theme.colors.text.primary }}>{sfx.trigger}</td>
              <td style={{ padding: "6px 8px", color: theme.colors.text.secondary, fontSize: 12 }}>
                {sfx.sceneTypes?.join(", ") ?? "all"}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  textAlign: "right",
                  fontFamily: theme.fonts.mono,
                  color: theme.colors.text.secondary,
                  fontSize: 12,
                }}
              >
                {sfx.volume}dB
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onApprove} disabled={disabled} style={btnStyle(theme.colors.status.success, disabled)}>
          Aprobar
        </button>
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          disabled={disabled}
          style={btnStyle(theme.colors.status.warning, disabled)}
        >
          Ajustar
        </button>
      </div>

      {showFeedback && (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe los ajustes de sonido..."
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

function btnStyle(bg: string, disabled?: boolean): React.CSSProperties {
  return {
    padding: "7px 16px",
    backgroundColor: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
    fontWeight: 500,
    opacity: disabled ? 0.5 : 1,
    transition: "opacity 150ms",
  }
}
