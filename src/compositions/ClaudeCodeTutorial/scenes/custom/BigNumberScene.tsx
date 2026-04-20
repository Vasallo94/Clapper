import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface Metric {
  value: string
  label: string
  prefix?: string
  suffix?: string
}

interface BigNumberProps {
  title?: string
  metrics: Metric[]
  timing?: Timing
  beats?: Beat[]
}

function extractNumeric(value: string): { numeric: number; isNumeric: boolean } {
  const cleaned = value.replace(/[^0-9.]/g, "")
  const num = parseFloat(cleaned)
  return { numeric: isNaN(num) ? 0 : num, isNumeric: !isNaN(num) && cleaned.length > 0 }
}

function formatAnimatedValue(value: string, progress: number): string {
  const { numeric, isNumeric } = extractNumeric(value)
  if (!isNumeric) return progress > 0.5 ? value : ""

  const current = numeric * progress
  // Preserve decimal places from original
  const decimalMatch = value.match(/\.(\d+)/)
  const decimals = decimalMatch ? decimalMatch[1].length : 0
  const formatted = current.toFixed(decimals)

  // Preserve non-numeric parts (e.g. "3.9x" → keep the pattern)
  return value.replace(/[\d.]+/, formatted)
}

export const BigNumberScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BigNumberProps
  const { title, metrics = [], timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))
  const beatOffset = title ? 1 : 0

  // Title animation
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleOpacity = title
    ? interpolate(frame, [titleDelay, titleDelay + Math.ceil(fps * 0.3)], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        gap: 48,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            textAlign: "center",
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: metrics.length === 1 ? 0 : 80,
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {metrics.map((metric, i) => {
          const metricDelay = beatStartFrames?.[i + beatOffset] ?? motionStartFrame + i * Math.ceil(fps * 0.3)

          // Value counter animation
          const counterDuration = Math.ceil(fps * 0.8)
          const counterProgress = interpolate(frame, [metricDelay, metricDelay + counterDuration], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })

          // Spring for entrance
          const entranceSpring = spring({
            frame: Math.max(0, frame - metricDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.5),
          })
          const metricOpacity = interpolate(entranceSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const metricY = interpolate(entranceSpring, [0, 1], [30, 0])

          // Label fade-in after value
          const labelDelay = metricDelay + counterDuration
          const labelOpacity = interpolate(frame, [labelDelay, labelDelay + Math.ceil(fps * 0.3)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })

          const displayValue = formatAnimatedValue(metric.value, counterProgress)

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                opacity: metricOpacity,
                transform: `translateY(${metricY}px)`,
                minWidth: 200,
              }}
            >
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: metrics.length === 1 ? 96 : 72,
                  fontWeight: 900,
                  color: tokens.primary,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                }}
              >
                {metric.prefix && (
                  <span style={{ fontSize: metrics.length === 1 ? 48 : 36, color: tokens.foregroundMid }}>
                    {metric.prefix}
                  </span>
                )}
                {displayValue}
                {metric.suffix && (
                  <span style={{ fontSize: metrics.length === 1 ? 48 : 36, color: tokens.foregroundMid }}>
                    {metric.suffix}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 22,
                  color: tokens.foreground,
                  opacity: labelOpacity * 0.7,
                  textAlign: "center",
                }}
              >
                {metric.label}
              </div>
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
