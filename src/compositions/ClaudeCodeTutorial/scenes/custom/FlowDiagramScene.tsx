import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface FlowDiagramProps {
  title: string
  description: string
  timing?: Timing
  beats?: Beat[]
}

const FlowDescription: React.FC<{ text: string; beat: Beat | null }> = ({ text, beat }) => {
  const tokens = useThemeTokens()
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 400,
    animationMs: 300,
  })

  return (
    <div
      style={{
        fontFamily: tokens.fontFamily,
        fontSize: 24,
        color: tokens.foreground,
        opacity: opacity * 0.8,
        transform: `translateY(${y}px)`,
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  )
}

export const FlowDiagramScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as FlowDiagramProps
  const { title, description, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  // Drawing animation is Phase 2 content animation
  const visualDelay = beats?.[2] ? getBeatStartFrame(beats[2], fps) : Math.ceil(fps * 1)
  const visualProgress = spring({
    frame: Math.max(0, frame - visualDelay),
    fps,
    config: { damping: 100 },
    durationInFrames: Math.ceil(fps * 3),
  })

  const mainLineLength = interpolate(visualProgress, [0, 0.4], [0, 500], { extrapolateRight: "clamp" })
  const branchDivergeLength = interpolate(visualProgress, [0.3, 0.5], [0, 100], { extrapolateRight: "clamp" })
  const featureLineLength = interpolate(visualProgress, [0.5, 0.8], [0, 200], { extrapolateRight: "clamp" })
  const mergeLineLength = interpolate(visualProgress, [0.8, 1], [0, 100], { extrapolateRight: "clamp" })

  const mainColor = tokens.primary
  const branchColor = "#a855f7"

  const getCommitOpacity = (progress: number, threshold: number) =>
    interpolate(progress, [threshold - 0.05, threshold], [0, 1], {
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
        padding: "40px 60px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 900, marginBottom: 80 }}>
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 48,
            fontWeight: 700,
            color: tokens.foreground,
            marginBottom: 24,
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
          }}
        >
          {title}
        </div>
        <FlowDescription text={description} beat={beats?.[1] ?? null} />
      </div>

      <div
        style={{
          width: 600,
          height: 200,
          position: "relative",
          opacity: interpolate(visualProgress, [0, 0.05], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <svg width="600" height="200" viewBox="0 0 600 200">
          <path
            d="M 50 150 L 550 150"
            fill="none"
            stroke={mainColor}
            strokeWidth="6"
            strokeDasharray="500"
            strokeDashoffset={500 - mainLineLength}
            strokeLinecap="round"
          />
          <path
            d="M 150 150 C 200 150, 200 50, 250 50"
            fill="none"
            stroke={branchColor}
            strokeWidth="6"
            strokeDasharray="150"
            strokeDashoffset={150 - branchDivergeLength * 1.5}
            strokeLinecap="round"
          />
          <path
            d="M 250 50 L 400 50"
            fill="none"
            stroke={branchColor}
            strokeWidth="6"
            strokeDasharray="150"
            strokeDashoffset={150 - featureLineLength * 0.75}
            strokeLinecap="round"
          />
          <path
            d="M 400 50 C 450 50, 450 150, 500 150"
            fill="none"
            stroke={branchColor}
            strokeWidth="6"
            strokeDasharray="150"
            strokeDashoffset={150 - mergeLineLength * 1.5}
            strokeLinecap="round"
          />

          <circle cx="50" cy="150" r="10" fill={mainColor} opacity={getCommitOpacity(visualProgress, 0.05)} />
          <circle cx="150" cy="150" r="10" fill={mainColor} opacity={getCommitOpacity(visualProgress, 0.15)} />
          <circle cx="280" cy="150" r="10" fill={mainColor} opacity={getCommitOpacity(visualProgress, 0.6)} />
          <circle cx="500" cy="150" r="10" fill={mainColor} opacity={getCommitOpacity(visualProgress, 0.95)} />

          <circle cx="250" cy="50" r="10" fill={branchColor} opacity={getCommitOpacity(visualProgress, 0.45)} />
          <circle cx="325" cy="50" r="10" fill={branchColor} opacity={getCommitOpacity(visualProgress, 0.65)} />
          <circle cx="400" cy="50" r="10" fill={branchColor} opacity={getCommitOpacity(visualProgress, 0.8)} />
        </svg>

        <div
          style={{
            position: "absolute",
            top: 170,
            left: 50,
            color: mainColor,
            fontFamily: tokens.monoFontFamily || tokens.fontFamily,
            fontWeight: "bold",
            opacity: getCommitOpacity(visualProgress, 0.1),
          }}
        >
          main
        </div>
        <div
          style={{
            position: "absolute",
            top: 15,
            left: 250,
            color: branchColor,
            fontFamily: tokens.monoFontFamily || tokens.fontFamily,
            fontWeight: "bold",
            opacity: getCommitOpacity(visualProgress, 0.5),
          }}
        >
          feature-branch
        </div>
      </div>
    </AbsoluteFill>
  )
}
