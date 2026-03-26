// src/compositions/ClaudeCodeTutorial/scenes/TerminalScene.tsx
import React, { useMemo } from "react"
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion"
import type { TerminalSceneProps, TerminalLine } from "../schema"
import { useThemeTokens, type ThemeTokens } from "../themes"
import { MascotWatermark } from "../components/MascotWatermark"

const COMMAND_CHARS_PER_FRAME = 0.5
const OUTPUT_REVEAL_FRAMES = 8
const CLAUDE_LINE_GAP_FRAMES = 18
const CLAUDE_CHARS_PER_FRAME = 1

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

type MessageProps = {
  line: LineWithTiming
  frame: number
  terminal: ThemeTokens["terminal"]
  monoFont: string
}

const UserMessage: React.FC<MessageProps> = ({ line, frame, terminal, monoFont }) => {
  const localFrame = frame - line.startFrame
  if (localFrame < 0) return null

  const chars = Math.floor(localFrame * COMMAND_CHARS_PER_FRAME)
  const displayText = line.text.slice(0, chars)

  return (
    <div
      style={{
        border: `1px solid ${terminal.userMessageBorder}`,
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 16,
        background: terminal.userMessageBg,
      }}
    >
      <div style={{ color: terminal.labelColor, fontSize: 11, fontFamily: monoFont, marginBottom: 4 }}>You</div>
      <div style={{ color: terminal.command, fontFamily: monoFont, fontSize: 14 }}>{displayText}</div>
    </div>
  )
}

const ClaudeMessage: React.FC<MessageProps> = ({ line, frame, terminal, monoFont }) => {
  const localFrame = frame - line.startFrame
  if (localFrame < 0) return null

  const chars = Math.floor(localFrame * CLAUDE_CHARS_PER_FRAME)
  const displayText = line.text.slice(0, chars)

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ color: terminal.claude, fontSize: 11, fontFamily: monoFont, marginBottom: 6, fontWeight: "bold" }}>
        ⏵ Claude
      </div>
      <div style={{ color: terminal.output, fontFamily: monoFont, fontSize: 14, paddingLeft: 4 }}>
        {displayText}
      </div>
    </div>
  )
}

const OutputMessage: React.FC<MessageProps> = ({ line, frame, terminal, monoFont }) => {
  const localFrame = frame - line.startFrame
  if (localFrame < 0) return null

  const isSuccess = line.text.includes("✓") || line.text.includes("✅")

  return (
    <div
      style={{
        borderLeft: `2px solid ${terminal.claude}`,
        paddingLeft: 12,
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      <div
        style={{
          color: isSuccess ? terminal.successColor : terminal.labelColor,
          fontFamily: monoFont,
          fontSize: 12,
        }}
      >
        {line.text}
      </div>
    </div>
  )
}

// Approximate rendered height per line kind (px)
const LINE_HEIGHT_MAP: Record<string, number> = {
  command: 58, // bordered box + padding + margin
  claude: 40, // label + text + spacing
  output: 24, // single line + margin
  blank: 12,
}

const CONTENT_AREA_HEIGHT = 420 // fixed visible height
const CONTENT_PADDING = 40 // top + bottom padding

export const TerminalScene: React.FC<TerminalSceneProps> = ({ title, lines }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const t = tokens.terminal

  const timedLines = useMemo(() => buildLineTiming(lines, fps), [lines, fps])

  // Calculate content scroll: estimate total height of visible lines
  // and shift content up when it exceeds the visible area
  const scrollY = useMemo(() => {
    let totalHeight = 0
    let visibleHeight = 0
    for (const line of timedLines) {
      const lineH = LINE_HEIGHT_MAP[line.kind] ?? 24
      totalHeight += lineH
      if (frame >= line.startFrame) {
        visibleHeight += lineH
      }
    }
    const overflow = visibleHeight - (CONTENT_AREA_HEIGHT - CONTENT_PADDING)
    return overflow > 0 ? overflow : 0
  }, [timedLines, frame])

  const windowSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })
  const windowY = interpolate(windowSpring, [0, 1], [20, 0])

  // Context bar animation
  const contextPercent = interpolate(frame, [0, fps * 3], [12, 34], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const filledBlocks = Math.round(contextPercent / 5)
  const contextBar = "█".repeat(filledBlocks) + "░".repeat(20 - filledBlocks)

  const isDarkScene = t.sceneBackground !== tokens.background

  return (
    <AbsoluteFill
      style={{
        background: t.sceneBackground,
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
            color: t.labelColor,
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
          boxShadow: t.shadow,
          opacity: windowSpring,
          transform: `translateY(${windowY}px)`,
          border: `1px solid ${t.borderColor}`,
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 36,
            background: t.titleBar,
            display: "flex",
            alignItems: "center",
            paddingLeft: 14,
            gap: 8,
            borderBottom: `1px solid ${t.borderColor}`,
          }}
        >
          {t.dots.map((color, i) => (
            <div
              key={i}
              style={{ width: 12, height: 12, borderRadius: "50%", background: color }}
            />
          ))}
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: tokens.monoFontFamily,
              fontSize: 12,
              color: t.titleText,
              marginRight: 52,
            }}
          >
            claude
          </div>
        </div>

        {/* Terminal content */}
        <div
          style={{
            background: t.bg,
            height: CONTENT_AREA_HEIGHT,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              transform: `translateY(${-scrollY}px)`,
            }}
          >
          {timedLines.map((line, i) => {
            if (line.kind === "command") {
              return <UserMessage key={i} line={line} frame={frame} terminal={t} monoFont={tokens.monoFontFamily} />
            }
            if (line.kind === "claude") {
              return <ClaudeMessage key={i} line={line} frame={frame} terminal={t} monoFont={tokens.monoFontFamily} />
            }
            if (line.kind === "output") {
              return <OutputMessage key={i} line={line} frame={frame} terminal={t} monoFont={tokens.monoFontFamily} />
            }
            // blank
            if (frame >= line.startFrame) {
              return <div key={i} style={{ height: 12 }} />
            }
            return null
          })}
          </div>
        </div>

        {/* Status bar */}
        <div
          style={{
            height: 28,
            background: t.statusBarBg,
            borderTop: `1px solid ${t.borderColor}`,
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 12,
            fontFamily: tokens.monoFontFamily,
            fontSize: 11,
          }}
        >
          <span style={{ color: t.claude }}>● claude-opus-4-6</span>
          <span style={{ color: t.separatorColor }}>│</span>
          <span style={{ color: t.costColor }}>Context:</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: t.successColor, fontSize: 9, letterSpacing: -1 }}>
              {contextBar.slice(0, filledBlocks)}
            </span>
            <span style={{ color: t.separatorColor, fontSize: 9, letterSpacing: -1 }}>
              {contextBar.slice(filledBlocks)}
            </span>
            <span style={{ color: t.labelColor }}>{Math.round(contextPercent)}%</span>
          </span>
          <span style={{ color: t.separatorColor }}>│</span>
          <span style={{ color: t.costColor }}>$0.04</span>
        </div>
      </div>

      <MascotWatermark animation="dial" darkBg={isDarkScene} />
    </AbsoluteFill>
  )
}
