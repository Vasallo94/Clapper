import { theme } from "../theme"

interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div
      className="animate-fade-in"
      style={{
        padding: "10px 14px",
        margin: "8px 0",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        color: theme.colors.status.error,
        borderRadius: theme.radius.md,
        border: `1px solid rgba(239, 68, 68, 0.3)`,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span>Error: {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "4px 10px",
            backgroundColor: theme.colors.status.error,
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
