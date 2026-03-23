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
import { useThemeTokens } from "../themes"

const { fontFamily } = loadFont("normal", { weights: ["400", "700"] })

const COMMAND_CHARS_PER_FRAME = 2
const OUTPUT_REVEAL_FRAMES = 4
const CLAUDE_LINE_GAP_FRAMES = 12
const CLAUDE_CHARS_PER_FRAME = 3

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

const TerminalLineItem: React.FC<{
  line: LineWithTiming
  frame: number
  colors: Record<TerminalLine["kind"], string>
}> = ({ line, frame, colors }) => {
  const localFrame = frame - line.startFrame
  if (localFrame < 0) return null

  let displayText = line.text
  if (line.kind === "command") {
    const chars = Math.floor(localFrame * COMMAND_CHARS_PER_FRAME)
    displayText = line.text.slice(0, chars)
  } else if (line.kind === "claude") {
    const chars = Math.floor(localFrame * CLAUDE_CHARS_PER_FRAME)
    displayText = line.text.slice(0, chars)
  }

  const prefix = line.kind === "command" ? "$ " : "  "

  return (
    <div
      style={{
        fontFamily,
        fontSize: 15,
        lineHeight: "24px",
        color: colors[line.kind],
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {line.kind === "blank" ? "\u00A0" : `${prefix}${displayText}`}
    </div>
  )
}

export const TerminalScene: React.FC<TerminalSceneProps> = ({ title, lines }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const timedLines = useMemo(() => buildLineTiming(lines, fps), [lines, fps])

  const windowSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })
  const windowY = interpolate(windowSpring, [0, 1], [20, 0])

  const lastCommand = [...timedLines].reverse().find((l) => l.kind === "command")
  const lastCommandDone = lastCommand
    ? frame >= lastCommand.startFrame + lastCommand.durationFrames
    : true
  const cursorVisible = !lastCommandDone && Math.floor(frame / 15) % 2 === 0

  const lineColors: Record<TerminalLine["kind"], string> = {
    command: tokens.terminal.command,
    output: tokens.terminal.output,
    claude: tokens.terminal.claude,
    blank: "transparent",
  }

  return (
    <AbsoluteFill
      style={{
        background: tokens.background,
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
            color: tokens.foregroundMid,
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
        }}
      >
        <div
          style={{
            height: 36,
            background: tokens.terminal.titleBar,
            display: "flex",
            alignItems: "center",
            paddingLeft: 14,
            gap: 8,
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
              fontFamily: tokens.fontFamily,
              fontSize: 12,
              color: tokens.terminal.titleText,
              marginRight: 52,
            }}
          >
            bash
          </div>
        </div>

        <div
          style={{
            background: tokens.terminal.bg,
            padding: "20px 24px",
            minHeight: 280,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {timedLines.map((line, i) => (
            <TerminalLineItem key={i} line={line} frame={frame} colors={lineColors} />
          ))}
          {cursorVisible && (
            <div
              style={{
                width: 8,
                height: 18,
                background: tokens.terminal.cursor,
                display: "inline-block",
                marginTop: 2,
              }}
            />
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}
