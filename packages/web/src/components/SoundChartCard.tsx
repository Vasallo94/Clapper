import React, { useState } from "react"
import type { SoundChartData } from "../types"

interface Props {
  data: SoundChartData
  onApprove: () => void
  onRequestChanges: (feedback: string) => void
}

export const SoundChartCard: React.FC<Props> = ({ data, onApprove, onRequestChanges }) => {
  const [feedback, setFeedback] = useState("")
  return (
    <div
      style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, margin: "8px 0", backgroundColor: "#fafafa" }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>🎵 Carta de sonido</h3>
      {data.music_bed && (
        <div style={{ marginBottom: 12 }}>
          <strong>Music bed:</strong> {data.music_bed.libraryId ?? "Custom"} ({data.music_bed.volume}dB, ducking:{" "}
          {data.music_bed.duckingVolume}dB)
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd" }}>
            <th style={{ textAlign: "left", padding: 4 }}>SFX</th>
            <th style={{ textAlign: "left", padding: 4 }}>Trigger</th>
            <th style={{ textAlign: "left", padding: 4 }}>Scenes</th>
            <th style={{ textAlign: "right", padding: 4 }}>Vol</th>
          </tr>
        </thead>
        <tbody>
          {data.sfx_entries.map((sfx) => (
            <tr key={sfx.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 4 }}>{sfx.id}</td>
              <td style={{ padding: 4 }}>{sfx.trigger}</td>
              <td style={{ padding: 4 }}>{sfx.sceneTypes?.join(", ") ?? "all"}</td>
              <td style={{ padding: 4, textAlign: "right" }}>{sfx.volume}dB</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          onClick={onApprove}
          style={{
            padding: "6px 16px",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Aprobar
        </button>
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback..."
          style={{ flex: 1, padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4 }}
        />
        <button
          onClick={() => onRequestChanges(feedback)}
          style={{
            padding: "6px 16px",
            backgroundColor: "#ff9800",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Ajustar
        </button>
      </div>
    </div>
  )
}
