import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface CountdownProps {
  title?: string
  targetLabel?: string
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
  timing?: Timing
  beats?: Beat[]
}

export const CountdownScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as CountdownProps
  const { title, targetLabel, days = 0, hours = 0, minutes = 0, seconds = 0, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Total seconds and countdown
  const totalStartSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds
  const elapsedSeconds = Math.max(0, (frame - motionStartFrame) / fps)
  const remaining = Math.max(0, totalStartSeconds - elapsedSeconds)

  const d = Math.floor(remaining / 86400)
  const h = Math.floor((remaining % 86400) / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = Math.floor(remaining % 60)

  const segments: { value: number; label: string }[] = []
  if (days > 0) segments.push({ value: d, label: "DAYS" })
  if (days > 0 || hours > 0) segments.push({ value: h, label: "HOURS" })
  segments.push({ value: m, label: "MINS" })
  segments.push({ value: s, label: "SECS" })

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleOpacity = interpolate(frame, [titleDelay, titleDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Target label
  const labelDelay = beatStartFrames?.[2] ?? motionStartFrame + Math.ceil(fps * 0.6)
  const labelOpacity = interpolate(frame, [labelDelay, labelDelay + Math.ceil(fps * 0.3)], [0, 1], {
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
      {title && (
        <div
          style={{
            fontSize: 18,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: titleOpacity,
            marginBottom: 24,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {segments.map((seg, i) => {
          const boxDelay = beatStartFrames?.[1] ?? motionStartFrame + Math.ceil(fps * 0.15) + i * Math.ceil(fps * 0.1)
          const boxSpring = spring({
            frame: Math.max(0, frame - boxDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.4),
          })
          const boxScale = interpolate(boxSpring, [0, 1], [0.7, 1])
          const boxOpacity = interpolate(boxSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

          const isLast = i === segments.length - 1

          return (
            <React.Fragment key={i}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: boxOpacity,
                  transform: `scale(${boxScale})`,
                }}
              >
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 900,
                    color: isLast ? tokens.primary : tokens.foreground,
                    fontFamily: tokens.monoFontFamily,
                    background: tokens.card.bg,
                    border: `1px solid ${isLast ? tokens.primary : tokens.card.border}`,
                    borderRadius: 10,
                    padding: "8px 20px",
                    minWidth: 80,
                    textAlign: "center",
                    boxShadow: tokens.card.shadow,
                  }}
                >
                  {String(seg.value).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: tokens.foregroundMid,
                    fontFamily: tokens.fontFamily,
                    letterSpacing: 1.5,
                  }}
                >
                  {seg.label}
                </div>
              </div>
              {i < segments.length - 1 && (
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    color: tokens.foregroundLow,
                    fontFamily: tokens.monoFontFamily,
                    marginBottom: 24,
                    opacity: boxOpacity,
                  }}
                >
                  :
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {targetLabel && (
        <div
          style={{
            fontSize: 18,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: labelOpacity,
            marginTop: 28,
          }}
        >
          {targetLabel}
        </div>
      )}

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
