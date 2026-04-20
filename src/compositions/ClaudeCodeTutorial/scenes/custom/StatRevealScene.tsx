import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface StatRevealProps {
  value: number
  suffix?: string
  prefix?: string
  label?: string
  sublabel?: string
  showBar?: boolean
  barPercent?: number
  timing?: Timing
  beats?: Beat[]
}

export const StatRevealScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as StatRevealProps
  const { value, suffix, prefix, label, sublabel, showBar, barPercent, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Label
  const labelDelay = beatStartFrames?.[0] ?? motionStartFrame
  const labelOpacity = interpolate(frame, [labelDelay, labelDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Number counter
  const counterDelay = beatStartFrames?.[1] ?? labelDelay + Math.ceil(fps * 0.15)
  const counterDuration = Math.ceil(fps * 0.8)
  const counterProgress = interpolate(frame, [counterDelay, counterDelay + counterDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const displayValue = Math.round(value * counterProgress)

  // Entrance spring for number
  const numSpring = spring({
    frame: Math.max(0, frame - counterDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const numY = interpolate(numSpring, [0, 1], [30, 0])
  const numOpacity = interpolate(numSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Prefix/suffix bounce
  const affixDelay = counterDelay + Math.ceil(counterDuration * 0.6)
  const affixSpring = spring({
    frame: Math.max(0, frame - affixDelay),
    fps,
    config: { damping: 15, stiffness: 200 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const affixOpacity = interpolate(affixSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const affixScale = interpolate(affixSpring, [0, 1], [0.5, 1])

  // Sublabel
  const subDelay = beatStartFrames?.[2] ?? counterDelay + counterDuration + Math.ceil(fps * 0.1)
  const subOpacity = interpolate(frame, [subDelay, subDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Progress bar
  const barDelay = subDelay + Math.ceil(fps * 0.15)
  const barSpring = spring({
    frame: Math.max(0, frame - barDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const barWidth = interpolate(barSpring, [0, 1], [0, barPercent ?? value])

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
      {/* Label */}
      {label && (
        <div
          style={{
            fontSize: 16,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: labelOpacity,
            marginBottom: 12,
          }}
        >
          {label}
        </div>
      )}

      {/* Number */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          opacity: numOpacity,
          transform: `translateY(${numY}px)`,
        }}
      >
        {prefix && (
          <span
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: tokens.primary,
              fontFamily: tokens.fontFamily,
              opacity: affixOpacity,
              transform: `scale(${affixScale})`,
              display: "inline-block",
            }}
          >
            {prefix}
          </span>
        )}
        <span
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: tokens.primary,
            fontFamily: tokens.fontFamily,
          }}
        >
          {displayValue}
        </span>
        {suffix && (
          <span
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: tokens.primary,
              fontFamily: tokens.fontFamily,
              opacity: affixOpacity,
              transform: `scale(${affixScale})`,
              display: "inline-block",
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Sublabel */}
      {sublabel && (
        <div
          style={{
            fontSize: 18,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: subOpacity,
            marginTop: 8,
          }}
        >
          {sublabel}
        </div>
      )}

      {/* Progress bar */}
      {showBar && (
        <div
          style={{
            width: 240,
            height: 6,
            background: `${tokens.foregroundLow}30`,
            borderRadius: 3,
            marginTop: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${barWidth}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${tokens.primary}, ${tokens.primary}cc)`,
              borderRadius: 3,
            }}
          />
        </div>
      )}

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
