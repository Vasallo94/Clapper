import React from "react"
import { AbsoluteFill, interpolate } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

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
  problemLabel?: string
  solutionLabel?: string
  problemColor?: string
  solutionColor?: string
  timing?: Timing
  beats?: Beat[]
}

const ProblemBlock: React.FC<{
  text: string
  label: string
  color: string
  beat: Beat | null
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ text, label, color, beat, tokens }) => {
  const problemColor = color
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 200,
    animationMs: 300,
  })

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        background: tokens.card.bg,
        border: `1px solid ${tokens.card.border}`,
        borderLeft: `4px solid ${problemColor}`,
        borderRadius: 12,
        padding: "24px 32px",
        boxShadow: tokens.card.shadow,
        maxWidth: 680,
        opacity,
        transform: `translateY(${y}px)`,
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
          {label}
        </div>
        <div style={{ fontSize: 22, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.5 }}>
          {text}
        </div>
      </div>
    </div>
  )
}

const SolutionBlock: React.FC<{
  text: string
  label: string
  color: string
  beat: Beat | null
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ text, label, color, beat, tokens }) => {
  const solutionColor = color
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 800,
    animationMs: 300,
  })

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        background: tokens.card.bg,
        border: `1px solid ${tokens.card.border}`,
        borderLeft: `4px solid ${solutionColor}`,
        borderRadius: 12,
        padding: "24px 32px",
        boxShadow: tokens.card.shadow,
        maxWidth: 680,
        opacity,
        transform: `translateY(${y}px)`,
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
          {label}
        </div>
        <div style={{ fontSize: 22, color: tokens.foreground, fontFamily: tokens.fontFamily, lineHeight: 1.5 }}>
          {text}
        </div>
      </div>
    </div>
  )
}

export const ProblemSolutionScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ProblemSolutionProps
  const {
    problem,
    solution,
    problemLabel = "El Problema",
    solutionLabel = "La Solución",
    problemColor: problemColorProp,
    solutionColor: solutionColorProp,
    beats,
  } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const pColor = problemColorProp || "#ef4444"
  const sColor = solutionColorProp || "#22c55e"

  const lineHeight = interpolate(phase1.progress, [0.5, 1], [0, 80], {
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
      <ProblemBlock text={problem} label={problemLabel} color={pColor} beat={beats?.[0] ?? null} tokens={tokens} />

      <div
        style={{
          width: 4,
          height: lineHeight,
          background: `linear-gradient(${pColor}, ${sColor})`,
          overflow: "hidden",
        }}
      />

      <SolutionBlock text={solution} label={solutionLabel} color={sColor} beat={beats?.[2] ?? null} tokens={tokens} />
    </AbsoluteFill>
  )
}
