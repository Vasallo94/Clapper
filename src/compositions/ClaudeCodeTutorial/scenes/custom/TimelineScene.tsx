import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"

interface TimelineItem {
  date: string
  text: string
  status?: "past" | "current" | "future"
}

interface TimelineProps {
  title?: string
  items: TimelineItem[]
  timing?: Timing
  beats?: Beat[]
}

const TimelineEntry: React.FC<{
  item: TimelineItem
  index: number
  isLast: boolean
  beat: Beat | null
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ item, index, isLast, beat, tokens }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const itemDelay = beat ? getBeatStartFrame(beat, fps) : Math.round((0.3 + index * 0.3) * fps)
  const itemSpring = spring({
    frame: Math.max(0, frame - itemDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const itemOpacity = interpolate(itemSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const itemScale = interpolate(itemSpring, [0, 1], [0.8, 1])

  const status = item.status ?? "past"
  const isFilled = status === "past" || status === "current"
  const nodeColor = isFilled ? tokens.primary : tokens.foregroundLow

  const pulseSpring = spring({
    frame: Math.max(0, frame - itemDelay - Math.ceil(fps * 0.3)),
    fps,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: Math.ceil(fps * 2),
  })
  const pulseScale = status === "current" ? 1 + interpolate(pulseSpring, [0, 0.5, 1], [0, 0.15, 0]) : 1

  const lineSpring = spring({
    frame: Math.max(0, frame - itemDelay - Math.ceil(fps * 0.1)),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.3),
  })
  const lineScaleY = interpolate(lineSpring, [0, 1], [0, 1])

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: itemOpacity }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: isFilled ? nodeColor : "transparent",
            border: `2px solid ${nodeColor}`,
            flexShrink: 0,
            transform: `scale(${itemScale * pulseScale})`,
            boxShadow: status === "current" ? `0 0 12px ${tokens.primary}60` : "none",
          }}
        />
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: isFilled ? tokens.primary : tokens.foregroundLow,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {item.date}
          </div>
          <div
            style={{
              fontSize: 17,
              color: isFilled ? tokens.foreground : tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
              lineHeight: 1.4,
            }}
          >
            {item.text}
          </div>
        </div>
      </div>

      {!isLast && (
        <div
          style={{
            width: 2,
            height: 28,
            background: tokens.primary,
            marginLeft: 7,
            transformOrigin: "top",
            transform: `scaleY(${lineScaleY})`,
            opacity: interpolate(lineSpring, [0, 0.3], [0, 0.5], { extrapolateRight: "clamp" }),
          }}
        />
      )}
    </div>
  )
}

export const TimelineScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as TimelineProps
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
        padding: "40px 80px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 40,
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((item, i) => (
          <TimelineEntry
            key={i}
            item={item}
            index={i}
            isLast={i === items.length - 1}
            beat={beats?.[i + beatOffset] ?? null}
            tokens={tokens}
          />
        ))}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
