import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface Step {
  title: string
  description?: string
  status?: "completed" | "current" | "pending"
}

interface StepListProps {
  title?: string
  steps: Step[]
  timing?: Timing
  beats?: Beat[]
}

export const StepListScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as StepListProps
  const { title, steps, timing, beats } = props
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
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 500, width: "100%" }}>
        {steps.map((step, i) => {
          const stepDelay =
            beatStartFrames?.[i + beatOffset] ?? motionStartFrame + Math.ceil(fps * 0.3) + i * Math.ceil(fps * 0.4)
          const stepSpring = spring({
            frame: Math.max(0, frame - stepDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.5),
          })
          const stepOpacity = interpolate(stepSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const stepScale = interpolate(stepSpring, [0, 1], [0.8, 1])

          const status = step.status ?? "completed"
          const isFilled = status === "completed"
          const isCurrent = status === "current"

          // Pulse for current step
          const pulseSpring = spring({
            frame: Math.max(0, frame - stepDelay - Math.ceil(fps * 0.3)),
            fps,
            config: { damping: 12, stiffness: 100 },
            durationInFrames: Math.ceil(fps * 2),
          })
          const pulseScale = isCurrent ? 1 + interpolate(pulseSpring, [0, 0.5, 1], [0, 0.12, 0]) : 1

          // Connector line
          const lineSpring = spring({
            frame: Math.max(0, frame - stepDelay - Math.ceil(fps * 0.2)),
            fps,
            config: { damping: 200 },
            durationInFrames: Math.ceil(fps * 0.3),
          })
          const lineScaleY = interpolate(lineSpring, [0, 1], [0, 1])

          return (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  opacity: stepOpacity,
                }}
              >
                {/* Number circle */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: isFilled ? tokens.primary : "transparent",
                    border: `2px solid ${isFilled || isCurrent ? tokens.primary : tokens.foregroundLow}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: isFilled ? tokens.primaryForeground : isCurrent ? tokens.primary : tokens.foregroundLow,
                    fontFamily: tokens.fontFamily,
                    flexShrink: 0,
                    transform: `scale(${stepScale * pulseScale})`,
                    boxShadow: isCurrent ? `0 0 12px ${tokens.primary}50` : "none",
                  }}
                >
                  {i + 1}
                </div>

                {/* Text */}
                <div style={{ paddingTop: 4 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: tokens.foreground,
                      fontFamily: tokens.fontFamily,
                    }}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div
                      style={{
                        fontSize: 14,
                        color: tokens.foregroundMid,
                        fontFamily: tokens.fontFamily,
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {step.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: 2,
                    height: 20,
                    background: tokens.foregroundLow,
                    marginLeft: 17,
                    transformOrigin: "top",
                    transform: `scaleY(${lineScaleY})`,
                    opacity: stepOpacity * 0.5,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
