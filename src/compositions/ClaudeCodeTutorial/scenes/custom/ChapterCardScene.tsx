import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ChapterCardProps {
  number?: string
  title: string
  subtitle?: string
  description?: string
  timing?: Timing
  beats?: Beat[]
}

export const ChapterCardScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ChapterCardProps
  const { number, title, subtitle, description, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Number background
  const numberDelay = beatStartFrames?.[0] ?? motionStartFrame
  const numberSpring = spring({
    frame: Math.max(0, frame - numberDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const numberOpacity = interpolate(numberSpring, [0, 0.3], [0, 0.15], { extrapolateRight: "clamp" })
  const numberScale = interpolate(numberSpring, [0, 1], [0.8, 1])

  // Title
  const titleDelay = beatStartFrames?.[1] ?? numberDelay + Math.ceil(fps * 0.1)
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Accent line
  const lineDelay = titleDelay + Math.ceil(fps * 0.1)
  const lineProgress = spring({
    frame: Math.max(0, frame - lineDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 80])

  // Subtitle
  const subtitleDelay = beatStartFrames?.[2] ?? lineDelay + Math.ceil(fps * 0.15)
  const subtitleOpacity = interpolate(frame, [subtitleDelay, subtitleDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Description
  const descDelay = beatStartFrames?.[3] ?? subtitleDelay + Math.ceil(fps * 0.15)
  const descOpacity = interpolate(frame, [descDelay, descDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Large background number */}
      {number && (
        <div
          style={{
            position: "absolute",
            fontSize: 160,
            fontWeight: 900,
            color: tokens.foreground,
            opacity: numberOpacity,
            transform: `scale(${numberScale})`,
            fontFamily: tokens.fontFamily,
            userSelect: "none",
          }}
        >
          {number}
        </div>
      )}

      {/* Content overlaying the number */}
      <div style={{ position: "relative", textAlign: "center", zIndex: 1 }}>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>

        {/* Accent line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            background: tokens.accentLine,
            margin: "16px auto",
          }}
        />

        {subtitle && (
          <div
            style={{
              fontSize: 20,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
              opacity: subtitleOpacity,
              marginBottom: 12,
            }}
          >
            {subtitle}
          </div>
        )}

        {description && (
          <div
            style={{
              fontSize: 16,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
              opacity: descOpacity,
              maxWidth: 500,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        )}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
