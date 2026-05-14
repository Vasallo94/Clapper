import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"

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

const ChartBar: React.FC<{
  item: BarChartItem
  index: number
  beat: Beat | null
  maxValue: number
  chartHeight: number
  barWidth: number
  isHighlighted: boolean
  showValues: boolean
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ item, beat, maxValue, chartHeight, barWidth, isHighlighted, showValues, tokens }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const barDelay = beat ? getBeatStartFrame(beat, fps) : Math.round((fps * 0.5) / 1)
  const barSpring = spring({
    frame: Math.max(0, frame - barDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const barHeight = interpolate(barSpring, [0, 1], [0, (item.value / maxValue) * chartHeight])
  const barOpacity = interpolate(barSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const barColor = item.color ?? (isHighlighted ? tokens.primary : tokens.secondary)
  const displayValue = Math.round(item.value * interpolate(barSpring, [0, 1], [0, 1]))

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
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
      <div
        style={{
          width: barWidth,
          height: barHeight,
          background: `linear-gradient(0deg, ${barColor}, ${barColor}cc)`,
          borderRadius: "4px 4px 0 0",
          opacity: barOpacity,
        }}
      />
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
}

export const BarChartScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BarChartProps
  const { title, items, highlightIndex, showValues = true, beats } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const maxValue = Math.max(...items.map((d) => d.value), 1)
  const chartHeight = 280
  const barWidth = Math.min(60, Math.floor(500 / items.length))

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
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ position: "relative", height: chartHeight + 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: Math.max(12, 24 - items.length * 2),
            height: chartHeight,
          }}
        >
          {items.map((item, i) => (
            <ChartBar
              key={i}
              item={item}
              index={i}
              beat={beats?.[i + beatOffset] ?? null}
              maxValue={maxValue}
              chartHeight={chartHeight}
              barWidth={barWidth}
              isHighlighted={highlightIndex === i}
              showValues={showValues}
              tokens={tokens}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: -10,
            right: -10,
            height: 1,
            background: tokens.foregroundLow,
            opacity: phase1.opacity,
          }}
        />
      </div>
      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
