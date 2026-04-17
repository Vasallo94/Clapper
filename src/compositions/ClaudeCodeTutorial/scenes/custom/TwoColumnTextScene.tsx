import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ColumnContent {
  title: string
  body: string
}

interface TwoColumnTextProps {
  title?: string
  left: ColumnContent
  right: ColumnContent
  timing?: Timing
  beats?: Beat[]
}

export const TwoColumnTextScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as TwoColumnTextProps
  const { title, left, right, timing, beats } = props
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

  // Left column
  const leftDelay = beatStartFrames?.[1] ?? motionStartFrame + Math.ceil(fps * 0.3)
  const leftSpring = spring({
    frame: Math.max(0, frame - leftDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const leftX = interpolate(leftSpring, [0, 1], [-25, 0])
  const leftOpacity = interpolate(leftSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Separator
  const sepDelay = leftDelay + Math.ceil(fps * 0.2)
  const sepSpring = spring({
    frame: Math.max(0, frame - sepDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const sepHeight = interpolate(sepSpring, [0, 1], [0, 100])
  const sepOpacity = interpolate(sepSpring, [0, 0.3], [0, 0.3], { extrapolateRight: "clamp" })

  // Right column
  const rightDelay = beatStartFrames?.[2] ?? sepDelay + Math.ceil(fps * 0.15)
  const rightSpring = spring({
    frame: Math.max(0, frame - rightDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const rightX = interpolate(rightSpring, [0, 1], [25, 0])
  const rightOpacity = interpolate(rightSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

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

      <div style={{ display: "flex", gap: 32, alignItems: "center", width: "100%" }}>
        {/* Left */}
        <div
          style={{
            flex: 1,
            opacity: leftOpacity,
            transform: `translateX(${leftX}px)`,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: tokens.foreground,
              fontFamily: tokens.fontFamily,
              marginBottom: 12,
            }}
          >
            {left.title}
          </div>
          <div
            style={{
              fontSize: 15,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
              lineHeight: 1.7,
            }}
          >
            {left.body}
          </div>
        </div>

        {/* Separator */}
        <div
          style={{
            width: 1,
            height: `${sepHeight}%`,
            background: tokens.foregroundLow,
            opacity: sepOpacity,
            flexShrink: 0,
          }}
        />

        {/* Right */}
        <div
          style={{
            flex: 1,
            opacity: rightOpacity,
            transform: `translateX(${rightX}px)`,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: tokens.foreground,
              fontFamily: tokens.fontFamily,
              marginBottom: 12,
            }}
          >
            {right.title}
          </div>
          <div
            style={{
              fontSize: 15,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
              lineHeight: 1.7,
            }}
          >
            {right.body}
          </div>
        </div>
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
