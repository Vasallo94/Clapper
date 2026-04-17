import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface BeforeAfterProps {
  title?: string
  leftLabel?: string
  leftItems: string[]
  rightLabel?: string
  rightItems: string[]
  leftAccent?: string
  rightAccent?: string
  timing?: Timing
  beats?: Beat[]
}

export const BeforeAfterScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BeforeAfterProps
  const {
    title,
    leftLabel = "Before",
    leftItems,
    rightLabel = "After",
    rightItems,
    leftAccent,
    rightAccent,
    timing,
    beats,
  } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const leftColor = leftAccent ?? tokens.terminal.labelColor
  const rightColor = rightAccent ?? tokens.terminal.successColor

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

  // Left panel
  const leftDelay = beatStartFrames?.[1] ?? titleDelay + Math.ceil(fps * 0.3)
  const leftSpring = spring({
    frame: Math.max(0, frame - leftDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.6),
  })
  const leftX = interpolate(leftSpring, [0, 1], [-40, 0])
  const leftOpacity = interpolate(leftSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Arrow
  const arrowDelay = leftDelay + Math.ceil(fps * 0.3)
  const arrowSpring = spring({
    frame: Math.max(0, frame - arrowDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.3),
  })
  const arrowOpacity = interpolate(arrowSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const arrowScale = interpolate(arrowSpring, [0, 1], [0.5, 1])

  // Right panel
  const rightDelay = beatStartFrames?.[2] ?? arrowDelay + Math.ceil(fps * 0.2)
  const rightSpring = spring({
    frame: Math.max(0, frame - rightDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.6),
  })
  const rightX = interpolate(rightSpring, [0, 1], [40, 0])
  const rightOpacity = interpolate(rightSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  const panelStyle = (accent: string): React.CSSProperties => ({
    flex: 1,
    background: tokens.card.bg,
    border: `1px solid ${tokens.card.border}`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: 10,
    padding: "24px 28px",
    boxShadow: tokens.card.shadow,
  })

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
            fontSize: 36,
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

      <div style={{ display: "flex", gap: 24, alignItems: "center", width: "100%" }}>
        {/* Left panel */}
        <div
          style={{
            ...panelStyle(leftColor),
            opacity: leftOpacity,
            transform: `translateX(${leftX}px)`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: leftColor,
              marginBottom: 16,
            }}
          >
            {leftLabel}
          </div>
          {leftItems.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 16,
                color: tokens.foreground,
                fontFamily: tokens.fontFamily,
                lineHeight: 1.6,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: leftColor,
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              {item}
            </div>
          ))}
        </div>

        {/* Arrow */}
        <div
          style={{
            fontSize: 32,
            color: tokens.foregroundMid,
            opacity: arrowOpacity,
            transform: `scale(${arrowScale})`,
            flexShrink: 0,
          }}
        >
          →
        </div>

        {/* Right panel */}
        <div
          style={{
            ...panelStyle(rightColor),
            opacity: rightOpacity,
            transform: `translateX(${rightX}px)`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: rightColor,
              marginBottom: 16,
            }}
          >
            {rightLabel}
          </div>
          {rightItems.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 16,
                color: tokens.foreground,
                fontFamily: tokens.fontFamily,
                lineHeight: 1.6,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: rightColor,
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              {item}
            </div>
          ))}
        </div>
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
