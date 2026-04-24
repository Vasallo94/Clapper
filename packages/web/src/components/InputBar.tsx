import { theme } from "../theme"

interface Props {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
}

export function InputBar({ value, onChange, onSend, disabled }: Props) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: `1px solid ${theme.colors.border.default}`,
        display: "flex",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) onSend()
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend()
        }}
        aria-label="Mensaje para generar video"
        placeholder="Describe el video que necesitas..."
        disabled={disabled}
        style={{
          flex: 1,
          padding: "10px 14px",
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.border.default}`,
          backgroundColor: theme.colors.bg.elevated,
          color: theme.colors.text.primary,
          fontSize: 14,
          fontFamily: theme.fonts.sans,
          outline: "none",
          transition: "border-color 150ms",
        }}
        onFocus={(e) => (e.target.style.borderColor = theme.colors.accent.primary)}
        onBlur={(e) => (e.target.style.borderColor = theme.colors.border.default)}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Enviar mensaje"
        style={{
          padding: "10px 20px",
          backgroundColor: theme.colors.accent.primary,
          color: "#fff",
          border: "none",
          borderRadius: theme.radius.md,
          cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 500,
          opacity: disabled || !value.trim() ? 0.5 : 1,
          transition: "opacity 150ms, background-color 150ms",
        }}
        onMouseEnter={(e) => {
          if (!disabled && value.trim()) e.currentTarget.style.backgroundColor = theme.colors.accent.primaryHover
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.accent.primary
        }}
      >
        Enviar
      </button>
    </div>
  )
}
