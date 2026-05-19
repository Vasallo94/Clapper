import type React from "react"

export function btnStyle(bg: string, disabled?: boolean): React.CSSProperties {
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
