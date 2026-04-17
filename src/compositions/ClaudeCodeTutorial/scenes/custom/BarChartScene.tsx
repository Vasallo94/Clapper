import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface BarChartItem {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  title?: string
  items: BarChartItem[]
  highlightIndex?: number
  showValues?: boolean
  timing?: Timing
  beats?: Beat[]
}

export const BarChartScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BarChartProps
  const { title, items, highlightIndex, showValues = true, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const maxValue = Math.max(...items.map((d) => d.value), 1)
  const chartHeight = 280
  const barWidth = Math.min(60, Math.floor(500 / items.length))

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

  // Baseline
  const baseDelay = (title ? beatStartFrames?.[1] : beatStartFrames?.[0]) ?? motionStartFrame + Math.ceil(fps * 0.3)
  const baseOpacity = interpolate(frame, [baseDelay, baseDelay + Math.ceil(fps * 0.15)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const beatOffset = title ? 2 : 1

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 32,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ position: "relative", height: chartHeight + 40 }}>
        {/* Bars */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: Math.max(12, 24 - items.length * 2),
            height: chartHeight,
          }}
        >
          {items.map((item, i) => {
            const barDelay = beatStartFrames?.[i + beatOffset] ?? baseDelay + Math.ceil(fps * 0.15) * (i + 1)
            const barSpring = spring({
              frame: Math.max(0, frame - barDelay),
              fps,
              config: { damping: 20, stiffness: 180 },
              durationInFrames: Math.ceil(fps * 0.5),
            })
            const barHeight = interpolate(barSpring, [0, 1], [0, (item.value / maxValue) * chartHeight])
            const barOpacity = interpolate(barSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

            const isHighlighted = highlightIndex === i
            const barColor = item.color ?? (isHighlighted ? tokens.primary : tokens.secondary)

            const displayValue = Math.round(item.value * interpolate(barSpring, [0, 1], [0, 1]))

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                {/* Value label */}
                {showValues && (
                  <div
                    style={{
                      fontSize: 13,
                      color: tokens.foreground,
                      fontFamily: tokens.monoFontFamily,
                      opacity: barOpacity,
                    }}
                  >
                    {displayValue}
                  </div>
                )}
                {/* Bar */}
                <div
                  style={{
                    width: barWidth,
                    height: barHeight,
                    background: `linear-gradient(0deg, ${barColor}, ${barColor}cc)`,
                    borderRadius: "4px 4px 0 0",
                    opacity: barOpacity,
                  }}
                />
                {/* Label */}
                <div
                  style={{
                    fontSize: 12,
                    color: tokens.foregroundMid,
                    fontFamily: tokens.fontFamily,
                    opacity: barOpacity,
                    textAlign: "center",
                    maxWidth: barWidth + 20,
                  }}
                >
                  {item.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Baseline */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: -10,
            right: -10,
            height: 1,
            background: tokens.foregroundLow,
            opacity: baseOpacity,
          }}
        />
      </div>
      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
