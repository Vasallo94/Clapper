import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"

interface ProgressBarItem {
  label: string
  value: number
  color?: string
}

interface ProgressBarsProps {
  title?: string
  items: ProgressBarItem[]
  timing?: Timing
  beats?: Beat[]
}

const ProgressBarRow: React.FC<{
  item: ProgressBarItem
  beat: Beat | null
  index: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ item, beat, index, tokens }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const barDelay = beat ? getBeatStartFrame(beat, fps) : Math.round((0.3 + index * 0.25) * fps)
  const barSpring = spring({
    frame: Math.max(0, frame - barDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.6),
  })
  const barFill = interpolate(barSpring, [0, 1], [0, item.value])
  const labelOpacity = interpolate(frame, [barDelay - Math.ceil(fps * 0.1), barDelay], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const barColor = item.color ?? tokens.primary
  const displayPercent = Math.round(barFill)

  return (
    <div style={{ opacity: labelOpacity }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontFamily: tokens.fontFamily,
        }}
      >
        <span style={{ fontSize: 15, color: tokens.foreground }}>{item.label}</span>
        <span style={{ fontSize: 15, color: tokens.foregroundMid }}>{displayPercent}%</span>
      </div>
      <div
        style={{
          height: 28,
          background: `${tokens.foregroundLow}20`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barFill}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
            borderRadius: 6,
          }}
        />
      </div>
    </div>
  )
}

export const ProgressBarsScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ProgressBarsProps
  const { title, items, beats } = props
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
        padding: "40px 100px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 36,
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((item, i) => (
          <ProgressBarRow key={i} item={item} beat={beats?.[i + beatOffset] ?? null} index={i} tokens={tokens} />
        ))}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
