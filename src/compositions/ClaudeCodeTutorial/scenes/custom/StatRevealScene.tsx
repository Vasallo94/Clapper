import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"

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
  const { value, suffix, prefix, label, sublabel, showBar, barPercent, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  // Number counter is Phase 2 content animation
  const counterDelay = beats?.[1] ? getBeatStartFrame(beats[1], fps) : Math.ceil(fps * 0.15)
  const counterDuration = Math.ceil(fps * 0.8)
  const counterProgress = interpolate(frame, [counterDelay, counterDelay + counterDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const displayValue = Math.round(value * counterProgress)

  const numOpacity = interpolate(frame, [counterDelay, counterDelay + Math.ceil(fps * 0.15)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

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
  const subDelay = beats?.[2] ? getBeatStartFrame(beats[2], fps) : counterDelay + counterDuration + Math.ceil(fps * 0.1)
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
      {label && (
        <div
          style={{
            fontSize: 16,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: phase1.opacity,
            marginBottom: 12,
          }}
        >
          {label}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          opacity: numOpacity,
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
