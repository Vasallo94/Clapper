import React from "react"
import { AbsoluteFill, Img, interpolate } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface QuoteProps {
  text: string
  author?: string
  role?: string
  avatarUrl?: string
  accentColor?: string
  timing?: Timing
  beats?: Beat[]
}

const QuoteAttribution: React.FC<{
  author: string
  role?: string
  avatarUrl?: string
  beat: Beat | null
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ author, role, avatarUrl, beat, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 500,
    animationMs: 250,
  })

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {avatarUrl && <Img src={avatarUrl} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: tokens.foreground, fontFamily: tokens.fontFamily }}>
          {author}
        </div>
        {role && <div style={{ fontSize: 13, color: tokens.foregroundMid, fontFamily: tokens.fontFamily }}>{role}</div>}
      </div>
    </div>
  )
}

export const QuoteScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as QuoteProps
  const { text, author, role, avatarUrl, accentColor, beats } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const accent = accentColor ?? tokens.primary

  const lineWidth = interpolate(phase1.progress, [0.3, 1], [0, 60], {
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
        padding: "60px 100px",
      }}
    >
      <div
        style={{
          fontSize: 120,
          fontFamily: "Georgia, serif",
          color: accent,
          opacity: phase1.opacity * 0.25,
          lineHeight: 0.8,
          marginBottom: -20,
          userSelect: "none",
        }}
      >
        {"“"}
      </div>

      <div
        style={{
          fontSize: 28,
          fontStyle: "italic",
          color: tokens.foreground,
          fontFamily: tokens.fontFamily,
          lineHeight: 1.6,
          textAlign: "center",
          maxWidth: 700,
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
        }}
      >
        {text}
      </div>

      <div
        style={{
          width: lineWidth,
          height: 2,
          background: accent,
          marginTop: 24,
          marginBottom: 24,
        }}
      />

      {author && (
        <QuoteAttribution author={author} role={role} avatarUrl={avatarUrl} beat={beats?.[2] ?? null} tokens={tokens} />
      )}

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
