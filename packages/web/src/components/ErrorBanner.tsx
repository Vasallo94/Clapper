import React from "react"

interface Props {
  message: string
}

export const ErrorBanner: React.FC<Props> = ({ message }) => (
  <div
    style={{
      padding: "8px 12px",
      margin: "8px 0",
      backgroundColor: "#ffebee",
      color: "#c62828",
      borderRadius: 4,
      border: "1px solid #ef9a9a",
      fontSize: 14,
    }}
  >
    Error: {message}
  </div>
)
