import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

const CrossIcon = ({ size, color }: { size: number; color: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const CheckIcon = ({ size, color }: { size: number; color: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

interface ProblemSolutionProps {
  problem: string
  solution: string
  timing?: Timing
  beats?: Beat[]
}

export const ProblemSolutionScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ProblemSolutionProps
  const { problem, solution, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const problemColor = "#ef4444"
  const solutionColor = "#22c55e"

  // Problem block (appears on Beat 0)
  const problemDelay = beatStartFrames?.[0] ?? motionStartFrame
  const problemSpring = spring({
    frame: Math.max(0, frame - problemDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const problemX = interpolate(problemSpring, [0, 1], [-30, 0])
  const problemOpacity = interpolate(problemSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Solution block (appears on Beat 2)
  const solutionDelay = beatStartFrames?.[2] ?? problemDelay + Math.ceil(fps * 1.5)
  const solutionSpring = spring({
    frame: Math.max(0, frame - solutionDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const solutionX = interpolate(solutionSpring, [0, 1], [-30, 0])
  const solutionOpacity = interpolate(solutionSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Gradient connector (appears right before solution)
  const lineDelay = solutionDelay - Math.ceil(fps * 0.2)
  const lineSpring = spring({
    frame: Math.max(0, frame - lineDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const lineHeight = interpolate(lineSpring, [0, 1], [0, 80])

  const blockStyle = (accent: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 20,
    background: tokens.card.bg,
    border: `1px solid ${tokens.card.border}`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 12,
    padding: "24px 32px",
    boxShadow: tokens.card.shadow,
    maxWidth: 680,
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
      {/* Problem */}
      <div
        style={{
          ...blockStyle(problemColor),
          opacity: problemOpacity,
          transform: `translateX(${problemX}px)`,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: `${problemColor}20`,
            border: `2px solid ${problemColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CrossIcon size={24} color={problemColor} />
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: problemColor,
              marginBottom: 8,
              fontFamily: tokens.fontFamily,
            }}
          >
            El Problema
          </div>
          <div style={{ fontSize: 22, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.5 }}>
            {problem}
          </div>
        </div>
      </div>

      {/* Gradient connector */}
      <div
        style={{
          width: 4,
          height: lineHeight,
          background: `linear-gradient(${problemColor}, ${solutionColor})`,
          marginLeft: 0,
          overflow: "hidden",
        }}
      />

      {/* Solution */}
      <div
        style={{
          ...blockStyle(solutionColor),
          opacity: solutionOpacity,
          transform: `translateX(${solutionX}px)`,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: `${solutionColor}20`,
            border: `2px solid ${solutionColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CheckIcon size={24} color={solutionColor} />
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: solutionColor,
              marginBottom: 8,
              fontFamily: tokens.fontFamily,
            }}
          >
            La Solución
          </div>
          <div style={{ fontSize: 22, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.5 }}>
            {solution}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
