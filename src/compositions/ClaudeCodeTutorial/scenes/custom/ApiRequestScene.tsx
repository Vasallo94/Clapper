import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ApiRequestProps {
  title?: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  endpoint: string
  requestBody?: string
  responseStatus: number
  responseBody: string
  language?: "json" | "curl"
  timing?: Timing
  beats?: Beat[]
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#50ff78",
  POST: "#58a6ff",
  PUT: "#febc2e",
  DELETE: "#ff5f57",
  PATCH: "#d2a8ff",
}

export const ApiRequestScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ApiRequestProps
  const { title, method, endpoint, requestBody, responseStatus, responseBody, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const methodColor = METHOD_COLORS[method] ?? tokens.primary
  const statusColor = responseStatus < 400 ? "#50ff78" : "#ff5f57"

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Method badge
  const badgeDelay = beatStartFrames?.[1] ?? motionStartFrame + Math.ceil(fps * 0.2)
  const badgeSpring = spring({
    frame: Math.max(0, frame - badgeDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.3),
  })
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1])
  const badgeOpacity = interpolate(badgeSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Request panel
  const reqDelay = beatStartFrames?.[2] ?? badgeDelay + Math.ceil(fps * 0.2)
  const reqLines = [endpoint, ...(requestBody?.split("\n") ?? [])]
  const reqDuration = Math.ceil(fps * 0.5)

  // Arrow
  const arrowDelay = reqDelay + reqDuration
  const arrowSpring = spring({
    frame: Math.max(0, frame - arrowDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.3),
  })
  const arrowOpacity = interpolate(arrowSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Response panel
  const resDelay = beatStartFrames?.[3] ?? arrowDelay + Math.ceil(fps * 0.2)
  const resLines = [`${responseStatus} ${responseStatus < 400 ? "OK" : "Error"}`, ...responseBody.split("\n")]
  const resDuration = Math.ceil(fps * 0.5)

  const panelStyle: React.CSSProperties = {
    flex: 1,
    background: "#0d1117",
    border: `1px solid ${tokens.card.border}`,
    borderRadius: 8,
    padding: 14,
    fontFamily: tokens.monoFontFamily,
    fontSize: 12,
    overflow: "hidden",
  }

  const renderLines = (lines: string[], delay: number, duration: number) => {
    const lineGap = duration / Math.max(lines.length, 1)
    return lines.map((line, i) => {
      const lineFrame = delay + i * lineGap
      const lineOpacity = interpolate(frame, [lineFrame, lineFrame + 8], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      return (
        <div key={i} style={{ color: tokens.foreground, opacity: lineOpacity, lineHeight: 1.6 }}>
          {line}
        </div>
      )
    })
  }

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 60px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 20,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", width: "100%", maxWidth: 800 }}>
        {/* Request */}
        <div style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: methodColor,
                background: `${methodColor}20`,
                padding: "2px 8px",
                borderRadius: 4,
                opacity: badgeOpacity,
                transform: `scale(${badgeScale})`,
                display: "inline-block",
              }}
            >
              {method}
            </div>
            <div style={{ fontSize: 10, color: "#50ff78", textTransform: "uppercase", letterSpacing: 1 }}>Request</div>
          </div>
          {renderLines(reqLines, reqDelay, reqDuration)}
        </div>

        {/* Arrow */}
        <div
          style={{
            fontSize: 28,
            color: tokens.foregroundLow,
            opacity: arrowOpacity,
            marginTop: 60,
            flexShrink: 0,
          }}
        >
          →
        </div>

        {/* Response */}
        <div style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: statusColor,
                background: `${statusColor}20`,
                padding: "2px 8px",
                borderRadius: 4,
                opacity: interpolate(frame, [resDelay, resDelay + 6], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                display: "inline-block",
              }}
            >
              {responseStatus}
            </div>
            <div style={{ fontSize: 10, color: "#58a6ff", textTransform: "uppercase", letterSpacing: 1 }}>Response</div>
          </div>
          {renderLines(resLines.slice(1), resDelay + 6, resDuration)}
        </div>
      </div>
    </AbsoluteFill>
  )
}
