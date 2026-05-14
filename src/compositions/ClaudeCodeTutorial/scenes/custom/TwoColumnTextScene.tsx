import React from "react"
import { AbsoluteFill, interpolate } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface ColumnContent {
  title: string
  body: string
}

interface TwoColumnTextProps {
  title?: string
  left: ColumnContent
  right: ColumnContent
  timing?: Timing
  beats?: Beat[]
}

const TextColumn: React.FC<{
  content: ColumnContent
  beat: Beat | null
  fallbackMs: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ content, beat, fallbackMs, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: fallbackMs,
    animationMs: 300,
  })

  return (
    <div style={{ flex: 1, opacity, transform: `translateY(${y}px)` }}>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: tokens.foreground,
          fontFamily: tokens.fontFamily,
          marginBottom: 12,
        }}
      >
        {content.title}
      </div>
      <div
        style={{
          fontSize: 15,
          color: tokens.foregroundMid,
          fontFamily: tokens.fontFamily,
          lineHeight: 1.7,
        }}
      >
        {content.body}
      </div>
    </div>
  )
}

export const TwoColumnTextScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as TwoColumnTextProps
  const { title, left, right, beats } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const sepHeight = interpolate(phase1.progress, [0.3, 1], [0, 100], {
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
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 32, alignItems: "center", width: "100%" }}>
        <TextColumn content={left} beat={beats?.[1] ?? null} fallbackMs={300} tokens={tokens} />

        <div
          style={{
            width: 1,
            height: `${sepHeight}%`,
            background: tokens.foregroundLow,
            opacity: phase1.opacity * 0.3,
            flexShrink: 0,
          }}
        />

        <TextColumn content={right} beat={beats?.[2] ?? null} fallbackMs={500} tokens={tokens} />
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
