// src/compositions/ClaudeCodeTutorial/scenes/TerminalScene.tsx
import React, { useMemo } from "react"
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion"
import { loadFont } from "@remotion/google-fonts/JetBrainsMono"
import { z } from "zod"
import { TutorialConfigSchema, TerminalLine } from "../schema"
import { useTheme } from "../ThemeContext"
import { useThemeTokens } from "../themes"
import { PhoneMascot } from "../components/PhoneMascot"

const { fontFamily } = loadFont("normal", { weights: ["400", "700"] })

const COMMAND_CHARS_PER_FRAME = 0.5
const OUTPUT_REVEAL_FRAMES = 8
const CLAUDE_LINE_GAP_FRAMES = 18
const CLAUDE_CHARS_PER_FRAME = 1

type TerminalSceneProps = Extract<
  z.infer<typeof TutorialConfigSchema>["scenes"][number],
  { type: "terminal" }
>

type LineWithTiming = TerminalLine & {
  startFrame: number
  durationFrames: number
}

function buildLineTiming(lines: TerminalLine[], fps: number): LineWithTiming[] {
  let cursor = 0
  return lines.map((line) => {
    const start = cursor
    let duration = 0
    if (line.kind === "command") {
      duration = Math.ceil(line.text.length / COMMAND_CHARS_PER_FRAME) + OUTPUT_REVEAL_FRAMES
    } else if (line.kind === "claude") {
      duration = Math.ceil(line.text.length / CLAUDE_CHARS_PER_FRAME) + CLAUDE_LINE_GAP_FRAMES
    } else {
      duration = OUTPUT_REVEAL_FRAMES
    }
    const delayFrames = line.delayAfterMs ? Math.ceil(line.delayAfterMs / (1000 / fps)) : 0
    cursor = start + duration + delayFrames
    return { ...line, startFrame: start, durationFrames: duration }
  })
}

const UserMessage: React.FC<{ line: LineWithTiming; frame: number }> = ({ line, frame }) => {
  const localFrame = frame - line.startFrame
  if (localFrame < 0) return null

  const chars = Math.floor(localFrame * COMMAND_CHARS_PER_FRAME)
  const displayText = line.text.slice(0, chars)

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 16,
        background: "#111",
      }}
    >
      <div style={{ color: "#888", fontSize: 11, fontFamily, marginBottom: 4 }}>You</div>
      <div style={{ color: "#e0e0e0", fontFamily, fontSize: 14 }}>{displayText}</div>
    </div>
  )
}

const ClaudeMessage: React.FC<{ line: LineWithTiming; frame: number }> = ({ line, frame }) => {
  const localFrame = frame - line.startFrame
  if (localFrame < 0) return null

  const chars = Math.floor(localFrame * CLAUDE_CHARS_PER_FRAME)
  const displayText = line.text.slice(0, chars)

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ color: "#C15F3C", fontSize: 11, fontFamily, marginBottom: 6, fontWeight: "bold" }}>
        ⏵ Claude
      </div>
      <div style={{ color: "#d4d4d4", fontFamily, fontSize: 14, paddingLeft: 4 }}>
        {displayText}
      </div>
    </div>
  )
}

const OutputMessage: React.FC<{ line: LineWithTiming; frame: number }> = ({ line, frame }) => {
  const localFrame = frame - line.startFrame
  if (localFrame < 0) return null

  const isSuccess = line.text.includes("✓") || line.text.includes("✅")

  return (
    <div
      style={{
        borderLeft: "2px solid #C15F3C",
        paddingLeft: 12,
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      <div
        style={{
          color: isSuccess ? "#6a9955" : "#888",
          fontFamily,
          fontSize: 12,
        }}
      >
        {line.text}
      </div>
    </div>
  )
}

export const TerminalScene: React.FC<TerminalSceneProps> = ({ title, lines }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const theme = useTheme()
  const tokens = useThemeTokens()
  const isLD = theme === "linea-directa"

  const timedLines = useMemo(() => buildLineTiming(lines, fps), [lines, fps])

  const windowSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })
  const windowY = interpolate(windowSpring, [0, 1], [20, 0])

  // Context bar animation
  const contextPercent = interpolate(frame, [0, fps * 3], [12, 34], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const filledBlocks = Math.round(contextPercent / 5)
  const contextBar = "█".repeat(filledBlocks) + "░".repeat(20 - filledBlocks)

  return (
    <AbsoluteFill
      style={{
        background: isLD ? "#111" : tokens.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 18,
            color: "#888",
            marginBottom: 24,
            alignSelf: "flex-start",
            width: "90%",
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          width: "90%",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: tokens.terminal.shadow,
          opacity: windowSpring,
          transform: `translateY(${windowY}px)`,
          border: "1px solid #333",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 36,
            background: tokens.terminal.titleBar,
            display: "flex",
            alignItems: "center",
            paddingLeft: 14,
            gap: 8,
            borderBottom: "1px solid #333",
          }}
        >
          {tokens.terminal.dots.map((color, i) => (
            <div
              key={i}
              style={{ width: 12, height: 12, borderRadius: "50%", background: color }}
            />
          ))}
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily,
              fontSize: 12,
              color: tokens.terminal.titleText,
              marginRight: 52,
            }}
          >
            claude
          </div>
        </div>

        {/* Terminal content */}
        <div
          style={{
            background: tokens.terminal.bg,
            padding: "20px 24px",
            minHeight: 260,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {timedLines.map((line, i) => {
            if (line.kind === "command") {
              return <UserMessage key={i} line={line} frame={frame} />
            }
            if (line.kind === "claude") {
              return <ClaudeMessage key={i} line={line} frame={frame} />
            }
            if (line.kind === "output") {
              return <OutputMessage key={i} line={line} frame={frame} />
            }
            // blank
            if (frame >= line.startFrame) {
              return <div key={i} style={{ height: 12 }} />
            }
            return null
          })}
        </div>

        {/* Status bar */}
        <div
          style={{
            height: 28,
            background: "#111",
            borderTop: "1px solid #333",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 12,
            fontFamily,
            fontSize: 11,
          }}
        >
          <span style={{ color: "#C15F3C" }}>● claude-opus-4-6</span>
          <span style={{ color: "#333" }}>│</span>
          <span style={{ color: "#666" }}>Context:</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#6a9955", fontSize: 9, letterSpacing: -1 }}>
              {contextBar.slice(0, filledBlocks)}
            </span>
            <span style={{ color: "#333", fontSize: 9, letterSpacing: -1 }}>
              {contextBar.slice(filledBlocks)}
            </span>
            <span style={{ color: "#888" }}>{Math.round(contextPercent)}%</span>
          </span>
          <span style={{ color: "#333" }}>│</span>
          <span style={{ color: "#666" }}>$0.04</span>
        </div>
      </div>

      {isLD && (
        <div style={{ position: "absolute", bottom: 20, right: 24, opacity: 0.7 }}>
          <PhoneMascot scale={0.5} animation="dial" />
        </div>
      )}
    </AbsoluteFill>
  )
}
