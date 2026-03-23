// src/compositions/ClaudeCodeTutorial/themes.ts
import { useTheme } from "./ThemeContext"
import type { ThemeName } from "./schema"

export type ThemeTokens = {
  // Backgrounds
  background: string
  backgroundGradient: string
  backgroundAlt: string
  // Foreground
  foreground: string
  foregroundMid: string
  foregroundLow: string
  // Brand
  primary: string
  primaryHover: string
  primaryActive: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  // Typography
  fontFamily: string
  // Terminal
  terminal: {
    bg: string
    titleBar: string
    titleText: string
    command: string
    output: string
    claude: string
    cursor: string
    shadow: string
    dots: [string, string, string]
  }
  // Cards / Callouts
  card: {
    bg: string
    bgGradient: string
    border: string
    accentBorder: string
    shadow: string
  }
  // Overlay
  overlay: string
  // Labels
  label: string
}

const defaultTheme: ThemeTokens = {
  background: "#0d1117",
  backgroundGradient: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
  backgroundAlt: "#161b22",
  foreground: "#f0f6fc",
  foregroundMid: "#8b949e",
  foregroundLow: "#484f58",
  primary: "#7ee787",
  primaryHover: "#6edd78",
  primaryActive: "#56d364",
  primaryForeground: "#0d1117",
  secondary: "#79c0ff",
  secondaryForeground: "#0d1117",
  fontFamily: "system-ui, sans-serif",
  terminal: {
    bg: "#0d1117",
    titleBar: "#21262d",
    titleText: "#6e7681",
    command: "#7ee787",
    output: "#c9d1d9",
    claude: "#79c0ff",
    cursor: "#7ee787",
    shadow: "0 20px 60px rgba(0,0,0,0.6)",
    dots: ["#ff5f57", "#febc2e", "#28c840"],
  },
  card: {
    bg: "#161b22",
    bgGradient: "linear-gradient(135deg, #161b22 0%, #21262d 100%)",
    border: "#30363d",
    accentBorder: "#7ee787",
    shadow: "0 12px 40px rgba(0,0,0,0.5)",
  },
  overlay: "rgba(0,0,0,0.65)",
  label: "Claude Code \u00B7 Tutorial",
}

const lineaDirectaTheme: ThemeTokens = {
  background: "#FFFFFF",
  backgroundGradient: "#FFFFFF",
  backgroundAlt: "#F7F7F7",
  foreground: "#1A1A1A",
  foregroundMid: "#888888",
  foregroundLow: "#555555",
  primary: "#CC3333",
  primaryHover: "#D04242",
  primaryActive: "#AF2C2C",
  primaryForeground: "#FFFFFF",
  secondary: "#225050",
  secondaryForeground: "#FFFFFF",
  fontFamily: "Arial, Helvetica, sans-serif",
  terminal: {
    bg: "#0d0d0d",
    titleBar: "#1a1a1a",
    titleText: "#666666",
    command: "#e0e0e0",
    output: "#d4d4d4",
    claude: "#C15F3C",
    cursor: "#C15F3C",
    shadow: "0 8px 30px rgba(0,0,0,0.3)",
    dots: ["#ff5f57", "#febc2e", "#28c840"],
  },
  card: {
    bg: "#FFFFFF",
    bgGradient: "#FFFFFF",
    border: "#EFEFEF",
    accentBorder: "#CC3333",
    shadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  overlay: "rgba(255,255,255,0.85)",
  label: "L\u00EDnea Directa \u00B7 Claude Code",
}

const themes: Record<ThemeName, ThemeTokens> = {
  default: defaultTheme,
  "linea-directa": lineaDirectaTheme,
}

export function getTheme(name: ThemeName): ThemeTokens {
  return themes[name]
}

export function useThemeTokens(): ThemeTokens {
  const name = useTheme()
  return getTheme(name)
}
