export const theme = {
  colors: {
    bg: {
      primary: "#0D0D0D",
      secondary: "#141414",
      elevated: "#1A1A1A",
      hover: "#242424",
    },
    accent: {
      primary: "#CC3333",
      primaryHover: "#E63939",
      primaryMuted: "rgba(204, 51, 51, 0.15)",
      primaryGlow: "rgba(204, 51, 51, 0.3)",
    },
    text: {
      primary: "#E8E8E8",
      secondary: "#888888",
      muted: "#555555",
      inverse: "#0D0D0D",
    },
    border: {
      default: "#2A2A2A",
      accent: "#CC3333",
      subtle: "#1E1E1E",
    },
    status: {
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
    },
  },
  fonts: {
    sans: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Cascadia Code', monospace",
  },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
} as const
