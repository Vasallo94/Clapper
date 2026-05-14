import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

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

const MethodBadge: React.FC<{
  method: string
  color: string
  beat: Beat | null
}> = ({ method, color, beat }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 200,
    animationMs: 250,
  })

  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: `${color}20`,
        padding: "2px 8px",
        borderRadius: 4,
        opacity,
        transform: `translateY(${y}px)`,
        display: "inline-block",
      }}
    >
      {method}
    </div>
  )
}

export const ApiRequestScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ApiRequestProps
  const { title, method, endpoint, requestBody, responseStatus, responseBody, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const methodColor = METHOD_COLORS[method] ?? tokens.primary
  const statusColor = responseStatus < 400 ? tokens.terminal.successColor : tokens.primary

  const reqLines = [endpoint, ...(requestBody?.split("\n") ?? [])]
  const resLines = [`${responseStatus} ${responseStatus < 400 ? "OK" : "Error"}`, ...responseBody.split("\n")]

  const reqDelay = beats?.[2] ? getBeatStartFrame(beats[2], fps) : Math.round((fps * 0.4) / 1)
  const reqDuration = Math.ceil(fps * 0.5)

  const arrowDelay = reqDelay + reqDuration
  const arrowOpacity = interpolate(frame, [arrowDelay, arrowDelay + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const resDelay = beats?.[3] ? getBeatStartFrame(beats[3], fps) : arrowDelay + Math.ceil(fps * 0.2)
  const resDuration = Math.ceil(fps * 0.5)

  const panelStyle: React.CSSProperties = {
    flex: 1,
    background: tokens.terminal.bg,
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
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", width: "100%", maxWidth: 800 }}>
        <div style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <MethodBadge method={method} color={methodColor} beat={beats?.[1] ?? null} />
            <div
              style={{
                fontSize: 10,
                color: tokens.terminal.successColor,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Request
            </div>
          </div>
          {renderLines(reqLines, reqDelay, reqDuration)}
        </div>

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
            <div style={{ fontSize: 10, color: tokens.terminal.claude, textTransform: "uppercase", letterSpacing: 1 }}>
              Response
            </div>
          </div>
          {renderLines(resLines.slice(1), resDelay + 6, resDuration)}
        </div>
      </div>
    </AbsoluteFill>
  )
}
