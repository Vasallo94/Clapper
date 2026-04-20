import React from "react"

const AGENT_LABELS: Record<string, { label: string; emoji: string }> = {
  researcher: { label: "Investigando", emoji: "🔍" },
  copywriter: { label: "Escribiendo", emoji: "✍️" },
  scene_creator: { label: "Creando escena", emoji: "🎨" },
  director: { label: "Dirigiendo", emoji: "🎬" },
  sound_engineer: { label: "Diseñando sonido", emoji: "🎵" },
}

interface Props {
  agentName: string
}

export const SubagentBadge: React.FC<Props> = ({ agentName }) => {
  const info = AGENT_LABELS[agentName] ?? { label: agentName, emoji: "⚙️" }
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 16,
        backgroundColor: "#f0f0f0",
        fontSize: 13,
        color: "#555",
      }}
    >
      <span>{info.emoji}</span>
      <span>{info.label}...</span>
    </div>
  )
}
