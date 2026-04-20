import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

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

export const ProgressBarsScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ProgressBarsProps
  const { title, items, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

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
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((item, i) => {
          const barDelay =
            beatStartFrames?.[i + beatOffset] ?? motionStartFrame + Math.ceil(fps * 0.3) + i * Math.ceil(fps * 0.25)
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
            <div key={i} style={{ opacity: labelOpacity }}>
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
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
