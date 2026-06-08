import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"

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
  // Support a decimal comma (es): "656,28" -> 656.28. A lone comma is the decimal
  // separator; if a dot is also present the comma is treated as a thousands separator.
  const cleaned = value.replace(/[^0-9.,]/g, "")
  const dotForm =
    cleaned.includes(",") && !cleaned.includes(".") ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "")
  const num = parseFloat(dotForm)
  return { numeric: isNaN(num) ? 0 : num, isNumeric: !isNaN(num) && dotForm.length > 0 }
}

function formatAnimatedValue(value: string, progress: number): string {
  const { numeric, isNumeric } = extractNumeric(value)
  if (!isNumeric) return progress > 0.5 ? value : ""

  const current = numeric * progress
  const decimalMatch = value.match(/[.,](\d+)/)
  const decimals = decimalMatch ? decimalMatch[1].length : 0
  const sep = value.includes(",") && !value.includes(".") ? "," : "."
  const formatted = current.toFixed(decimals).replace(".", sep)

  return value.replace(/[\d.,]+/, formatted)
}

const MetricCard: React.FC<{
  metric: Metric
  beat: Beat | null
  index: number
  metricsCount: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ metric, beat, index, metricsCount, tokens }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const metricDelay = beat ? getBeatStartFrame(beat, fps) : Math.round((0.3 + index * 0.3) * fps)
  const counterDuration = Math.ceil(fps * 0.8)
  const counterProgress = interpolate(frame, [metricDelay, metricDelay + counterDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const metricOpacity = interpolate(frame, [metricDelay, metricDelay + Math.ceil(fps * 0.15)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const labelDelay = metricDelay + counterDuration
  const labelOpacity = interpolate(frame, [labelDelay, labelDelay + Math.ceil(fps * 0.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const displayValue = formatAnimatedValue(metric.value, counterProgress)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity: metricOpacity,
        minWidth: 200,
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: metricsCount === 1 ? 96 : 72,
          fontWeight: 900,
          color: tokens.primary,
          lineHeight: 1,
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        {metric.prefix && (
          <span style={{ fontSize: metricsCount === 1 ? 48 : 36, color: tokens.foregroundMid }}>{metric.prefix}</span>
        )}
        {displayValue}
        {metric.suffix && (
          <span style={{ fontSize: metricsCount === 1 ? 48 : 36, color: tokens.foregroundMid }}>{metric.suffix}</span>
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
}

export const BigNumberScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BigNumberProps
  const { title, metrics = [], beats } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })
  const beatOffset = title ? 1 : 0

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
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
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
        {metrics.map((metric, i) => (
          <MetricCard
            key={i}
            metric={metric}
            beat={beats?.[i + beatOffset] ?? null}
            index={i}
            metricsCount={metrics.length}
            tokens={tokens}
          />
        ))}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
