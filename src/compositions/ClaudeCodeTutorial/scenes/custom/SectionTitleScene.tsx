import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface SectionTitleProps {
  title: string
  subtitle?: string
  number?: string
  timing?: Timing
  beats?: Beat[]
}

export const SectionTitleScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as SectionTitleProps
  const { title, subtitle, number: sectionNumber, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Number animation
  const numberDelay = beatStartFrames?.[0] ?? motionStartFrame
  const numberSpring = spring({
    frame: Math.max(0, frame - numberDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const numberOpacity = interpolate(numberSpring, [0, 0.3], [0, 0.15], { extrapolateRight: "clamp" })
  const numberScale = interpolate(numberSpring, [0, 1], [0.8, 1])

  // Accent line
  const lineDelay = numberDelay + Math.ceil(fps * 0.1)
  const lineProgress = spring({
    frame: Math.max(0, frame - lineDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 80])

  // Title animation
  const titleDelay = beatStartFrames?.[1] ?? lineDelay + Math.ceil(fps * 0.1)
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Subtitle animation
  const subtitleDelay = beatStartFrames?.[2] ?? titleDelay + Math.ceil(fps * 0.2)
  const subtitleSpring = spring({
    frame: Math.max(0, frame - subtitleDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const subtitleOpacity = interpolate(subtitleSpring, [0, 0.3], [0, 0.7], { extrapolateRight: "clamp" })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        position: "relative",
      }}
    >
      {/* Section number (large, faded) */}
      {sectionNumber && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 160,
            fontWeight: 900,
            color: tokens.primary,
            opacity: numberOpacity,
            transform: `scale(${numberScale})`,
            position: "absolute",
            lineHeight: 1,
          }}
        >
          {sectionNumber}
        </div>
      )}

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          background: tokens.primary,
          borderRadius: 2,
          marginBottom: 12,
        }}
      />

      {/* Title */}
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 48,
          fontWeight: 700,
          color: tokens.foreground,
          textAlign: "center",
          maxWidth: 800,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 24,
            color: tokens.foreground,
            opacity: subtitleOpacity,
            textAlign: "center",
            maxWidth: 600,
          }}
        >
          {subtitle}
        </div>
      )}

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
