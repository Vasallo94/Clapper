// src/compositions/ClaudeCodeTutorial/themes.ts
import { loadFont } from "@remotion/google-fonts/JetBrainsMono"
import { useTheme } from "./ThemeContext"
import type { ThemeName } from "./schema"

const { fontFamily: monoFont } = loadFont("normal", { weights: ["400", "700"] })

export type ThemeTokens = {
  // Backgrounds
  background: string
  backgroundGradient: string
  // Foreground
  foreground: string
  foregroundMid: string
  foregroundLow: string
  // Brand
  primary: string
  primaryForeground: string
  secondary: string
  // Typography
  fontFamily: string
  monoFontFamily: string
  // Terminal
  terminal: {
    sceneBackground: string
    bg: string
    titleBar: string
    titleText: string
    command: string
    output: string
    claude: string
    shadow: string
    dots: [string, string, string]
    labelColor: string
    successColor: string
    statusBarBg: string
    borderColor: string
    separatorColor: string
    costColor: string
    userMessageBg: string
    userMessageBorder: string
  }
  // Cards / Callouts
  card: {
    bg: string
    bgGradient: string
    border: string
    accentBorder: string
    shadow: string
  }
  // Mascot
  mascot: {
    show: boolean
    cornerScale: number
    cornerOpacity: number
    cornerBottom: number
    cornerRight: number
  }
  // Overlay
  overlay: string
  // Labels
  label: string
  labelColor: string
  // Accent line (intro decoration)
  accentLine: string
}

const defaultTheme: ThemeTokens = {
  background: "#0d1117",
  backgroundGradient: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
  foreground: "#f0f6fc",
  foregroundMid: "#8b949e",
  foregroundLow: "#484f58",
  primary: "#7ee787",
  primaryForeground: "#0d1117",
  secondary: "#79c0ff",
  fontFamily: "system-ui, sans-serif",
  monoFontFamily: monoFont,
  terminal: {
    sceneBackground: "#0d1117",
    bg: "#0d1117",
    titleBar: "#21262d",
    titleText: "#6e7681",
    command: "#7ee787",
    output: "#c9d1d9",
    claude: "#79c0ff",
    shadow: "0 20px 60px rgba(0,0,0,0.6)",
    dots: ["#ff5f57", "#febc2e", "#28c840"],
    labelColor: "#8b949e",
    successColor: "#7ee787",
    statusBarBg: "#161b22",
    borderColor: "#30363d",
    separatorColor: "#30363d",
    costColor: "#484f58",
    userMessageBg: "#161b22",
    userMessageBorder: "#30363d",
  },
  card: {
    bg: "#161b22",
    bgGradient: "linear-gradient(135deg, #161b22 0%, #21262d 100%)",
    border: "#30363d",
    accentBorder: "#7ee787",
    shadow: "0 12px 40px rgba(0,0,0,0.5)",
  },
  mascot: {
    show: false,
    cornerScale: 0.5,
    cornerOpacity: 0.7,
    cornerBottom: 20,
    cornerRight: 24,
  },
  overlay: "rgba(0,0,0,0.65)",
  label: "Claude Code \u00B7 Tutorial",
  labelColor: "#484f58",
  accentLine: "linear-gradient(90deg, #7ee787, #79c0ff)",
}

const lineaDirectaTheme: ThemeTokens = {
  background: "#FFFFFF",
  backgroundGradient: "#FFFFFF",
  foreground: "#1A1A1A",
  foregroundMid: "#888888",
  foregroundLow: "#555555",
  primary: "#CC3333",
  primaryForeground: "#FFFFFF",
  secondary: "#225050",
  fontFamily: "Arial, Helvetica, sans-serif",
  monoFontFamily: monoFont,
  terminal: {
    sceneBackground: "radial-gradient(ellipse at 50% 60%, #2d1c22 0%, #141014 100%)",
    bg: "#0d0d0d",
    titleBar: "#1a1a1a",
    titleText: "#666666",
    command: "#e0e0e0",
    output: "#d4d4d4",
    claude: "#C15F3C",
    shadow: "0 8px 30px rgba(0,0,0,0.3)",
    dots: ["#ff5f57", "#febc2e", "#28c840"],
    labelColor: "#888888",
    successColor: "#6a9955",
    statusBarBg: "#111111",
    borderColor: "#333333",
    separatorColor: "#333333",
    costColor: "#666666",
    userMessageBg: "#111111",
    userMessageBorder: "#333333",
  },
  card: {
    bg: "#FFFFFF",
    bgGradient: "#FFFFFF",
    border: "#EFEFEF",
    accentBorder: "#CC3333",
    shadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  mascot: {
    show: true,
    cornerScale: 0.5,
    cornerOpacity: 0.7,
    cornerBottom: 20,
    cornerRight: 24,
  },
  overlay: "rgba(255,255,255,0.85)",
  label: "L\u00EDnea Directa \u00B7 Claude Code",
  labelColor: "#CC3333",
  accentLine: "#CC3333",
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
