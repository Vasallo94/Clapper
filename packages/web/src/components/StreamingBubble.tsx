import React, { useState } from "react"
import type { AgentArtifact, ToolEntry } from "../types"
import { theme } from "../theme"
import { SubagentBadge } from "./SubagentBadge"
import { AgentArtifactCard } from "./AgentArtifactCard"
import { ClapperboardIcon } from "./WorkingIndicator"

interface Props {
  agentName: string
  tools: ToolEntry[]
  artifacts?: AgentArtifact[]
  llmText?: string
  status: "active" | "completed" | "error"
  durationMs?: number
  defaultExpanded?: boolean
}

const STATUS_COLORS = {
  active: { dot: "#f59e0b", border: theme.colors.border.default, name: "#f59e0b" },
  completed: { dot: "#22c55e", border: theme.colors.border.subtle, name: "#22c55e" },
  error: { dot: "#ef4444", border: "rgba(239,68,68,0.3)", name: "#ef4444" },
}

export function StreamingBubble({
  agentName,
  tools,
  artifacts = [],
  llmText,
  status,
  durationMs,
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const colors = STATUS_COLORS[status]
  const doneTools = tools.filter((t) => t.status === "done").length

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setExpanded((prev) => !prev)
    }
  }

  if (!expanded) {
    return (
      <div
        className="animate-slide-in"
        role="button"
        tabIndex={0}
        aria-expanded={false}
        aria-label={`Expandir detalles de ${agentName}`}
        onClick={() => setExpanded(true)}
        onKeyDown={handleKeyDown}
        style={{
          background: theme.colors.bg.elevated,
          padding: "8px 12px",
          borderRadius: theme.radius.md,
          border: `1px solid ${colors.border}`,
          marginBottom: 6,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: colors.dot }} />
          <span style={{ color: colors.name, fontSize: 12, fontWeight: 600, fontFamily: theme.fonts.mono }}>
            {agentName}
          </span>
          <span style={{ color: theme.colors.text.muted, fontSize: 11 }}>
            {doneTools} tools{artifacts.length ? ` · ${artifacts.length} artefactos` : ""}
            {durationMs ? ` · ${(durationMs / 1000).toFixed(0)}s` : ""}
          </span>
        </div>
        <span style={{ color: theme.colors.text.muted, fontSize: 10 }}>&#9660;</span>
      </div>
    )
  }

  return (
    <div
      className="animate-card-reveal"
      style={{
        background: theme.colors.bg.elevated,
        padding: "10px 12px",
        borderRadius: theme.radius.md,
        border: `1px solid ${colors.border}`,
        marginBottom: 6,
      }}
    >
      <div
        role={status === "completed" ? "button" : undefined}
        tabIndex={status === "completed" ? 0 : undefined}
        aria-expanded={status === "completed" ? true : undefined}
        aria-label={status === "completed" ? `Colapsar detalles de ${agentName}` : undefined}
        onClick={() => status === "completed" && setExpanded(false)}
        onKeyDown={status === "completed" ? handleKeyDown : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: tools.length > 0 || llmText || artifacts.length > 0 ? 8 : 0,
          cursor: status === "completed" ? "pointer" : "default",
        }}
      >
        <div
          className={status === "active" ? "animate-pulse" : undefined}
          style={{ width: 6, height: 6, borderRadius: "50%", background: colors.dot, flexShrink: 0 }}
        />
        <span style={{ color: colors.name, fontSize: 12, fontWeight: 600, fontFamily: theme.fonts.mono }}>
          {agentName}
        </span>
        {status === "active" && <SubagentBadge agentName={agentName} />}
        {status === "active" && (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <ClapperboardIcon size={20} />
          </span>
        )}
        {status === "completed" && (
          <span style={{ color: theme.colors.text.muted, fontSize: 10, marginLeft: "auto" }}>&#9650;</span>
        )}
      </div>

      {tools.length > 0 && (
        <div
          style={{
            borderLeft: `2px solid ${theme.colors.border.default}`,
            paddingLeft: 10,
            marginBottom: llmText || artifacts.length ? 8 : 0,
          }}
        >
          {tools.map((t) => (
            <div
              key={t.id}
              style={{ fontSize: 11, marginBottom: 2, fontFamily: theme.fonts.mono, display: "flex", gap: 6 }}
            >
              <span
                style={{
                  color: t.status === "done" ? "#22c55e" : t.status === "error" ? "#ef4444" : "#f59e0b",
                  flexShrink: 0,
                }}
              >
                {t.status === "done" ? "✓" : t.status === "error" ? "✗" : "▶"}
              </span>
              <span style={{ color: theme.colors.text.secondary }}>
                {t.name}
                {t.input && <span style={{ color: theme.colors.text.muted }}> {t.input}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {llmText && (
        <div
          style={{
            border: `1px solid ${theme.colors.border.subtle}`,
            borderRadius: theme.radius.sm,
            padding: "8px 10px",
            backgroundColor: theme.colors.bg.primary,
            fontSize: 12,
            color: theme.colors.text.secondary,
            lineHeight: 1.5,
            maxHeight: 150,
            overflow: "auto",
            marginBottom: artifacts.length ? 8 : 0,
            whiteSpace: "pre-wrap",
          }}
        >
          <div
            style={{
              color: theme.colors.text.muted,
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Pensamiento operativo visible
          </div>
          {llmText}
          {status === "active" && <span className="loading-dot" style={{ marginLeft: 2 }} />}
        </div>
      )}

      {artifacts.map((artifact) => (
        <AgentArtifactCard key={artifact.id} artifact={artifact} />
      ))}
    </div>
  )
}
