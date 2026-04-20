import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface CodeBlockProps {
  code: string
  language: string
  title?: string
  highlightLines?: number[]
  timing?: Timing
  beats?: Beat[]
}

type TokenType = "key" | "value" | "comment" | "string" | "punctuation" | "heading" | "default"

interface Token {
  text: string
  type: TokenType
}

function tokenizeLine(line: string, language: string): Token[] {
  if (!line.trim()) return [{ text: line || "\u00A0", type: "default" }]

  if (language === "yaml") {
    if (line.trimStart().startsWith("#")) return [{ text: line, type: "comment" }]
    if (line.trim() === "---") return [{ text: line, type: "punctuation" }]
    const colonIdx = line.indexOf(":")
    if (colonIdx > 0 && !line.trimStart().startsWith("-")) {
      const key = line.slice(0, colonIdx + 1)
      const val = line.slice(colonIdx + 1)
      const tokens: Token[] = [{ text: key, type: "key" }]
      if (val.trim()) {
        const trimmedVal = val.trim()
        if (trimmedVal.startsWith('"') || trimmedVal.startsWith("'")) {
          tokens.push({ text: val, type: "string" })
        } else {
          tokens.push({ text: val, type: "value" })
        }
      }
      return tokens
    }
    if (line.trimStart().startsWith("-")) {
      return [{ text: line, type: "value" }]
    }
    return [{ text: line, type: "default" }]
  }

  if (language === "markdown") {
    if (line.startsWith("#")) return [{ text: line, type: "heading" }]
    if (line.startsWith("```")) return [{ text: line, type: "punctuation" }]
    if (line.trimStart().startsWith("- ") || line.trimStart().startsWith("* ")) return [{ text: line, type: "value" }]
    return [{ text: line, type: "default" }]
  }

  if (language === "bash") {
    if (line.trimStart().startsWith("#")) return [{ text: line, type: "comment" }]
    if (line.trimStart().startsWith("$")) {
      return [
        { text: line.slice(0, line.indexOf("$") + 1), type: "punctuation" },
        { text: line.slice(line.indexOf("$") + 1), type: "value" },
      ]
    }
    return [{ text: line, type: "default" }]
  }

  if (language === "typescript" || language === "javascript") {
    if (line.trimStart().startsWith("//")) return [{ text: line, type: "comment" }]
    if (line.trimStart().startsWith("import ") || line.trimStart().startsWith("export "))
      return [{ text: line, type: "key" }]
    return [{ text: line, type: "default" }]
  }

  return [{ text: line, type: "default" }]
}

function getTokenColor(type: TokenType, tokens: ReturnType<typeof useThemeTokens>): string {
  // All colors must work on dark terminal.bg — never use page-level foreground tokens here
  switch (type) {
    case "key":
      return tokens.terminal.claude
    case "value":
      return tokens.terminal.output
    case "comment":
      return tokens.terminal.labelColor
    case "string":
      return tokens.terminal.command
    case "punctuation":
      return tokens.terminal.costColor
    case "heading":
      return tokens.terminal.command
    default:
      return tokens.terminal.output
  }
}

export const CodeBlockScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as CodeBlockProps
  const { code = "", language = "yaml", title, highlightLines = [], timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))
  const localFrame = Math.max(0, frame - motionStartFrame)

  const lines = code.split("\n")
  const revealDuration = Math.ceil(fps * 1.5)
  const lineGap = revealDuration / Math.max(lines.length, 1)

  // Card entrance
  const cardSpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const cardOpacity = interpolate(cardSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const cardY = interpolate(cardSpring, [0, 1], [20, 0])

  // Title animation (use first beat if available)
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleOpacity = interpolate(frame, [titleDelay, titleDelay + Math.ceil(fps * 0.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        gap: 24,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 960,
          background: tokens.terminal.bg,
          border: `1px solid ${tokens.terminal.borderColor}`,
          borderRadius: 10,
          overflow: "hidden",
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
          boxShadow: tokens.terminal.shadow,
        }}
      >
        {/* Header bar */}
        <div
          style={{
            height: 38,
            background: tokens.terminal.titleBar,
            borderBottom: `1px solid ${tokens.terminal.borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {tokens.terminal.dots.map((dotColor, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor }} />
            ))}
          </div>
          <span
            style={{
              fontFamily: tokens.monoFontFamily,
              fontSize: 11,
              color: tokens.terminal.titleText,
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            {language}
          </span>
        </div>

        {/* Code content */}
        <div style={{ padding: "20px 0", overflow: "hidden" }}>
          {lines.map((line, li) => {
            const lineRevealFrame = li * lineGap
            const lineOpacity = interpolate(localFrame, [lineRevealFrame, lineRevealFrame + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })

            const isHighlighted = highlightLines.includes(li + 1)
            const highlightProgress = isHighlighted
              ? interpolate(localFrame, [lineRevealFrame + 10, lineRevealFrame + 20], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 0

            const lineTokens = tokenizeLine(line, language)

            return (
              <div
                key={li}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  padding: "2px 24px 2px 0",
                  opacity: lineOpacity,
                  background: isHighlighted ? `${tokens.primary}18` : "transparent",
                  position: "relative",
                }}
              >
                {/* Line number */}
                <span
                  style={{
                    fontFamily: tokens.monoFontFamily,
                    fontSize: 14,
                    color: tokens.terminal.labelColor,
                    width: 48,
                    textAlign: "right",
                    paddingRight: 16,
                    flexShrink: 0,
                    userSelect: "none",
                  }}
                >
                  {li + 1}
                </span>

                {/* Highlight bar */}
                {isHighlighted && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      background: tokens.primary,
                      opacity: highlightProgress,
                    }}
                  />
                )}

                {/* Code tokens */}
                <span style={{ fontFamily: tokens.monoFontFamily, fontSize: 17, lineHeight: 1.7 }}>
                  {lineTokens.map((token, ti) => (
                    <span key={ti} style={{ color: getTokenColor(token.type, tokens) }}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
