import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import { CrossIcon, CheckIcon } from "./svg-icons"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ProblemSolutionProps {
  title?: string
  problem: { text: string }
  solution: { text: string }
  timing?: Timing
  beats?: Beat[]
}

export const ProblemSolutionScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ProblemSolutionProps
  const { title, problem, solution, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const problemColor = tokens.terminal.labelColor
  const solutionColor = tokens.terminal.successColor

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

  // Problem block
  const problemDelay = beatStartFrames?.[1] ?? titleDelay + Math.ceil(fps * 0.3)
  const problemSpring = spring({
    frame: Math.max(0, frame - problemDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const problemX = interpolate(problemSpring, [0, 1], [-30, 0])
  const problemOpacity = interpolate(problemSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  // Gradient connector
  const lineDelay = problemDelay + Math.ceil(fps * 0.4)
  const lineSpring = spring({
    frame: Math.max(0, frame - lineDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const lineHeight = interpolate(lineSpring, [0, 1], [0, 60])

  // Solution block
  const solutionDelay = beatStartFrames?.[2] ?? lineDelay + Math.ceil(fps * 0.3)
  const solutionSpring = spring({
    frame: Math.max(0, frame - solutionDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const solutionX = interpolate(solutionSpring, [0, 1], [-30, 0])
  const solutionOpacity = interpolate(solutionSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  const blockStyle = (accent: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: tokens.card.bg,
    border: `1px solid ${tokens.card.border}`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: 10,
    padding: "20px 28px",
    boxShadow: tokens.card.shadow,
    maxWidth: 600,
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
      {title && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 40,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

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
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: `${problemColor}20`,
            border: `2px solid ${problemColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          <CrossIcon size={20} color={problemColor} />
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: problemColor,
              marginBottom: 4,
            }}
          >
            Problem
          </div>
          <div style={{ fontSize: 18, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.4 }}>
            {problem.text}
          </div>
        </div>
      </div>

      {/* Gradient connector */}
      <div
        style={{
          width: 3,
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
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: `${solutionColor}20`,
            border: `2px solid ${solutionColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          <CheckIcon size={20} color={solutionColor} />
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: solutionColor,
              marginBottom: 4,
            }}
          >
            Solution
          </div>
          <div style={{ fontSize: 18, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.4 }}>
            {solution.text}
          </div>
        </div>
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
