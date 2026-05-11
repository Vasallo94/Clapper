import type { IntentDecisionData } from "../types"
import { theme } from "../theme"

interface Props {
  data: IntentDecisionData
  compact?: boolean
}

function flag(label: string, enabled?: boolean) {
  return (
    <span
      style={{
        padding: "3px 6px",
        borderRadius: theme.radius.sm,
        backgroundColor: enabled ? theme.colors.status.success + "1f" : theme.colors.bg.primary,
        color: enabled ? theme.colors.status.success : theme.colors.text.muted,
        border: `1px solid ${enabled ? theme.colors.status.success + "33" : theme.colors.border.subtle}`,
        fontSize: 11,
        fontFamily: theme.fonts.mono,
      }}
    >
      {label}
    </span>
  )
}

export function IntentDecisionCard({ data, compact }: Props) {
  return (
    <div
      style={{
        border: `1px solid ${data.missing_target ? theme.colors.status.warning : theme.colors.border.default}`,
        borderRadius: theme.radius.md,
        padding: compact ? "8px 10px" : theme.spacing.md,
        margin: compact ? "8px 0" : "12px 0",
        backgroundColor: theme.colors.bg.elevated,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ width: 3, height: 18, backgroundColor: theme.colors.accent.primary, borderRadius: 2 }} />
        <h3 style={{ margin: 0, color: theme.colors.text.primary, fontSize: 14, fontWeight: 700 }}>
          Modo: {data.mode}
        </h3>
        {data.confidence != null && (
          <span style={{ color: theme.colors.text.muted, fontSize: 11, fontFamily: theme.fonts.mono }}>
            {Math.round(data.confidence * 100)}%
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: data.target ? 8 : 0 }}>
        {flag("write", data.can_write_files)}
        {flag("render", data.can_render)}
        {flag("checkpoint", data.requires_checkpoint)}
        {data.missing_target && flag("target requerido", false)}
      </div>

      {data.target && (
        <div style={{ fontSize: 12, color: theme.colors.text.secondary, fontFamily: theme.fonts.mono }}>
          target: {data.target.title || data.target.configId || data.target.configPath}
        </div>
      )}

      {!compact && data.rationale && (
        <div style={{ marginTop: 8, fontSize: 12, color: theme.colors.text.secondary, lineHeight: 1.5 }}>
          {data.rationale}
        </div>
      )}
    </div>
  )
}
