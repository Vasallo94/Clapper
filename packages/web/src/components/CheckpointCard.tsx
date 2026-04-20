import { useState } from "react"
import type { CheckpointData } from "../types"

interface Props {
  data: CheckpointData
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
  disabled?: boolean
}

export function CheckpointCard({ data, onApprove, onRequestChanges, disabled }: Props) {
  const [feedback, setFeedback] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)

  const totalDuration = data.scenes.reduce((sum, s) => sum + (s.durationInSeconds || 0), 0)

  return (
    <div
      style={{
        border: "2px solid #CC3333",
        borderRadius: 12,
        padding: 16,
        margin: "12px 0",
        backgroundColor: "#fff",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#CC3333" }}>Escaleta propuesta</h3>

      {data.brief && (
        <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
          <strong>Plataforma:</strong> {data.brief.platform} | <strong>Audiencia:</strong> {data.brief.audience} |{" "}
          <strong>Tono:</strong> {data.brief.tone}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>
            <th style={{ padding: "4px 8px" }}>#</th>
            <th style={{ padding: "4px 8px" }}>Tipo</th>
            <th style={{ padding: "4px 8px" }}>Contenido</th>
            <th style={{ padding: "4px 8px" }}>Duracion</th>
          </tr>
        </thead>
        <tbody>
          {data.scenes.map((scene, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "4px 8px" }}>{i + 1}</td>
              <td style={{ padding: "4px 8px" }}>{scene.type}</td>
              <td style={{ padding: "4px 8px" }}>{scene.title || scene.text || "-"}</td>
              <td style={{ padding: "4px 8px" }}>{scene.durationInSeconds}s</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        <strong>Duracion total:</strong> {totalDuration}s
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onApprove}
          disabled={disabled}
          style={{
            padding: "8px 16px",
            backgroundColor: "#22c55e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          Aprobar
        </button>
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          disabled={disabled}
          style={{
            padding: "8px 16px",
            backgroundColor: "#f59e0b",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          Pedir cambios
        </button>
      </div>

      {showFeedback && (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe los cambios que quieres..."
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ddd",
              fontSize: 13,
              minHeight: 60,
            }}
          />
          <button
            onClick={() => {
              onRequestChanges(feedback)
              setFeedback("")
              setShowFeedback(false)
            }}
            disabled={disabled || !feedback.trim()}
            style={{
              marginTop: 4,
              padding: "6px 12px",
              backgroundColor: "#CC3333",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: disabled || !feedback.trim() ? "not-allowed" : "pointer",
              fontSize: 13,
            }}
          >
            Enviar feedback
          </button>
        </div>
      )}
    </div>
  )
}
