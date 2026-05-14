import React from "react"
import { AbsoluteFill, interpolate } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface ChapterCardProps {
  number?: string
  title: string
  subtitle?: string
  description?: string
  timing?: Timing
  beats?: Beat[]
}

const ChapterSubtitle: React.FC<{ text: string; beat: Beat | null }> = ({ text, beat }) => {
  const tokens = useThemeTokens()
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 400,
    animationMs: 250,
  })

  return (
    <div
      style={{
        fontSize: 20,
        color: tokens.foregroundMid,
        fontFamily: tokens.fontFamily,
        opacity,
        transform: `translateY(${y}px)`,
        marginBottom: 12,
      }}
    >
      {text}
    </div>
  )
}

const ChapterDescription: React.FC<{ text: string; beat: Beat | null }> = ({ text, beat }) => {
  const tokens = useThemeTokens()
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 550,
    animationMs: 250,
  })

  return (
    <div
      style={{
        fontSize: 16,
        color: tokens.foregroundMid,
        fontFamily: tokens.fontFamily,
        opacity,
        transform: `translateY(${y}px)`,
        maxWidth: 500,
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  )
}

export const ChapterCardScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ChapterCardProps
  const { number, title, subtitle, description, beats } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const lineWidth = interpolate(phase1.progress, [0.3, 1], [0, 80], {
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
      {number && (
        <div
          style={{
            position: "absolute",
            fontSize: 160,
            fontWeight: 900,
            color: tokens.foreground,
            opacity: phase1.opacity * 0.15,
            transform: `scale(${phase1.scale})`,
            fontFamily: tokens.fontFamily,
            userSelect: "none",
          }}
        >
          {number}
        </div>
      )}

      <div style={{ position: "relative", textAlign: "center", zIndex: 1 }}>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
          }}
        >
          {title}
        </div>

        <div
          style={{
            width: lineWidth,
            height: 3,
            background: tokens.accentLine,
            margin: "16px auto",
          }}
        />

        {subtitle && <ChapterSubtitle text={subtitle} beat={beats?.[2] ?? null} />}
        {description && <ChapterDescription text={description} beat={beats?.[3] ?? null} />}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
