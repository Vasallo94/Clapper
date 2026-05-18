import React, { useEffect, useRef, useState } from "react"
import type { SubagentStreamInterface, ToolCallWithResult } from "@langchain/langgraph-sdk/react"
import { theme } from "../theme"
import { SubagentBadge } from "./SubagentBadge"
import { ClapperboardIcon } from "./WorkingIndicator"

interface Props {
  subagent: SubagentStreamInterface
  defaultExpanded?: boolean
}

const STATUS_COLORS: Record<string, { dot: string; border: string; name: string }> = {
  pending: { dot: "#f59e0b", border: theme.colors.border.default, name: "#f59e0b" },
  running: { dot: "#f59e0b", border: theme.colors.border.default, name: "#f59e0b" },
  complete: { dot: "#22c55e", border: theme.colors.border.subtle, name: "#22c55e" },
  error: { dot: "#ef4444", border: "rgba(239,68,68,0.3)", name: "#ef4444" },
}

function formatDuration(startedAt: Date | null, completedAt: Date | null): string | null {
  if (!startedAt) return null
  const end = completedAt ?? new Date()
  const ms = end.getTime() - startedAt.getTime()
  return `${(ms / 1000).toFixed(0)}s`
}

function toolIcon(tc: ToolCallWithResult): { char: string; color: string } {
  const isDone = tc.result !== undefined
  if (!isDone) return { char: "▶", color: "#f59e0b" } // ▶
  const resultContent = typeof tc.result?.content === "string" ? tc.result.content : ""
  const isError = /^[Ee]rror\b/.test(resultContent.trim()) || tc.state === "error"
  if (isError) return { char: "✗", color: "#ef4444" } // ✗
  return { char: "✓", color: "#22c55e" } // ✓
}

function extractMessageText(msg: { content: unknown }): string {
  const content = msg.content
  if (typeof content === "string") return content.trim()
  if (Array.isArray(content)) {
    return (content.filter((c: { type: string }) => c.type === "text") as { type: "text"; text: string }[])
      .map((t) => t.text)
      .join("")
      .trim()
  }
  return ""
}

function extractThinkingText(subagent: SubagentStreamInterface): string {
  const aiMessages = subagent.messages.filter((m) => (m as { type: string }).type === "ai")
  if (aiMessages.length === 0) return ""
  // Show all AI reasoning steps, not just the last, so intermediate decisions are visible
  return aiMessages
    .map((m) => extractMessageText(m as { content: unknown }))
    .filter(Boolean)
    .join("\n\n─────\n\n")
}

export function SubagentCard({ subagent, defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const prevStatus = useRef(subagent.status)

  // Auto-collapse when subagent completes
  useEffect(() => {
    if (prevStatus.current !== "complete" && subagent.status === "complete") {
      setExpanded(false)
    }
    prevStatus.current = subagent.status
  }, [subagent.status])

  const colors = STATUS_COLORS[subagent.status] ?? STATUS_COLORS.pending
  const agentName = subagent.toolCall.args.subagent_type ?? subagent.toolCall.name
  const doneTools = subagent.toolCalls.filter((tc) => tc.result !== undefined).length
  const duration = formatDuration(subagent.startedAt, subagent.completedAt)
  const thinkingText = extractThinkingText(subagent)
  const isActive = subagent.status === "running" || subagent.status === "pending"

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setExpanded((prev) => !prev)
    }
  }

  // --- Collapsed state ---
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
            {doneTools} tools{duration ? ` · ${duration}` : ""}
          </span>
        </div>
        <span style={{ color: theme.colors.text.muted, fontSize: 10 }}>{"▼"}</span>
      </div>
    )
  }

  // --- Expanded state ---
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
      {/* Header row */}
      <div
        role={subagent.status === "complete" ? "button" : undefined}
        tabIndex={subagent.status === "complete" ? 0 : undefined}
        aria-expanded={subagent.status === "complete" ? true : undefined}
        aria-label={subagent.status === "complete" ? `Colapsar detalles de ${agentName}` : undefined}
        onClick={() => subagent.status === "complete" && setExpanded(false)}
        onKeyDown={subagent.status === "complete" ? handleKeyDown : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: subagent.toolCalls.length > 0 || thinkingText ? 8 : 0,
          cursor: subagent.status === "complete" ? "pointer" : "default",
        }}
      >
        <div
          className={isActive ? "animate-pulse" : undefined}
          style={{ width: 6, height: 6, borderRadius: "50%", background: colors.dot, flexShrink: 0 }}
        />
        <span style={{ color: colors.name, fontSize: 12, fontWeight: 600, fontFamily: theme.fonts.mono }}>
          {agentName}
        </span>
        {isActive && <SubagentBadge agentName={agentName} />}
        {isActive && (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <ClapperboardIcon size={20} />
          </span>
        )}
        {subagent.status === "complete" && (
          <span style={{ color: theme.colors.text.muted, fontSize: 10, marginLeft: "auto" }}>{"▲"}</span>
        )}
      </div>

      {/* Tool calls list */}
      {subagent.toolCalls.length > 0 && (
        <div
          style={{
            borderLeft: `2px solid ${theme.colors.border.default}`,
            paddingLeft: 10,
            marginBottom: thinkingText ? 8 : 0,
          }}
        >
          {subagent.toolCalls.map((tc) => {
            const icon = toolIcon(tc)
            return (
              <div
                key={tc.id}
                style={{ fontSize: 11, marginBottom: 2, fontFamily: theme.fonts.mono, display: "flex", gap: 6 }}
              >
                <span style={{ color: icon.color, flexShrink: 0 }}>{icon.char}</span>
                <span style={{ color: theme.colors.text.secondary }}>{tc.call.name}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Thinking text */}
      {thinkingText && (
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
          {thinkingText}
          {isActive && <span className="loading-dot" style={{ marginLeft: 2 }} />}
        </div>
      )}
    </div>
  )
}
