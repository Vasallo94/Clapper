import { theme } from "../theme"

export function Header() {
  return (
    <header
      style={{
        padding: "14px 20px",
        borderBottom: `1px solid ${theme.colors.border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div style={{ width: 3, height: 20, backgroundColor: theme.colors.accent.primary, borderRadius: 2 }} />
      <span style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text.primary, letterSpacing: "-0.01em" }}>
        Video Generator
      </span>
      <span style={{ fontSize: 12, color: theme.colors.text.muted, fontFamily: theme.fonts.mono, marginLeft: 4 }}>
        mission control
      </span>
    </header>
  )
}
