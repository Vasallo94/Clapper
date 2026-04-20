import React from "react"

interface Props {
  progress: number
}

export const RenderProgress: React.FC<Props> = ({ progress }) => (
  <div style={{ margin: "8px 0" }}>
    <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Renderizando... {progress}%</div>
    <div style={{ width: "100%", height: 8, backgroundColor: "#e0e0e0", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#CC3333", borderRadius: 4 }} />
    </div>
  </div>
)
