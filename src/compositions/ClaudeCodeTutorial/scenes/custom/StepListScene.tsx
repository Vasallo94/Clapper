import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"

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

const StepItem: React.FC<{
  step: Step
  index: number
  isLast: boolean
  beat: Beat | null
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ step, index, isLast, beat, tokens }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const stepDelay = beat ? getBeatStartFrame(beat, fps) : Math.round((0.3 + index * 0.4) * fps)
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

  const pulseSpring = spring({
    frame: Math.max(0, frame - stepDelay - Math.ceil(fps * 0.3)),
    fps,
    config: { damping: 12, stiffness: 100 },
    durationInFrames: Math.ceil(fps * 2),
  })
  const pulseScale = isCurrent ? 1 + interpolate(pulseSpring, [0, 0.5, 1], [0, 0.12, 0]) : 1

  const lineSpring = spring({
    frame: Math.max(0, frame - stepDelay - Math.ceil(fps * 0.2)),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.3),
  })
  const lineScaleY = interpolate(lineSpring, [0, 1], [0, 1])

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, opacity: stepOpacity }}>
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
          {index + 1}
        </div>

        <div style={{ paddingTop: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: tokens.foreground, fontFamily: tokens.fontFamily }}>
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

      {!isLast && (
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
}

export const StepListScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as StepListProps
  const { title, steps, beats } = props
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
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 36,
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 500, width: "100%" }}>
        {steps.map((step, i) => (
          <StepItem
            key={i}
            step={step}
            index={i}
            isLast={i === steps.length - 1}
            beat={beats?.[i + beatOffset] ?? null}
            tokens={tokens}
          />
        ))}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
