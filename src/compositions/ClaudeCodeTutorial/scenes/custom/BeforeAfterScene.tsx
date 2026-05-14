import React from "react"
import { AbsoluteFill } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface BeforeAfterProps {
  title?: string
  leftLabel?: string
  leftItems: string[]
  rightLabel?: string
  rightItems: string[]
  leftAccent?: string
  rightAccent?: string
  timing?: Timing
  beats?: Beat[]
}

const Panel: React.FC<{
  label: string
  items: string[]
  accent: string
  beat: Beat | null
  index: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ label, items, accent, beat, index, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 300 + index * 400,
    animationMs: 300,
  })

  return (
    <div
      style={{
        flex: 1,
        background: tokens.card.bg,
        border: `1px solid ${tokens.card.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        padding: "24px 28px",
        boxShadow: tokens.card.shadow,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          color: accent,
          marginBottom: 16,
        }}
      >
        {label}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            fontSize: 16,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            lineHeight: 1.6,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: accent,
              flexShrink: 0,
              marginTop: 8,
            }}
          />
          {item}
        </div>
      ))}
    </div>
  )
}

const Arrow: React.FC<{ beat: Beat | null; tokens: ReturnType<typeof useThemeTokens> }> = ({ beat, tokens }) => {
  const { opacity } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 600,
    animationMs: 200,
  })

  return (
    <div
      style={{
        fontSize: 32,
        color: tokens.foregroundMid,
        opacity,
        flexShrink: 0,
      }}
    >
      →
    </div>
  )
}

export const BeforeAfterScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BeforeAfterProps
  const {
    title,
    leftLabel = "Before",
    leftItems,
    rightLabel = "After",
    rightItems,
    leftAccent,
    rightAccent,
    beats,
  } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const leftColor = leftAccent ?? tokens.terminal.labelColor
  const rightColor = rightAccent ?? tokens.terminal.successColor

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
            marginBottom: 32,
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, alignItems: "center", width: "100%" }}>
        <Panel
          label={leftLabel}
          items={leftItems}
          accent={leftColor}
          beat={beats?.[1] ?? null}
          index={0}
          tokens={tokens}
        />
        <Arrow beat={null} tokens={tokens} />
        <Panel
          label={rightLabel}
          items={rightItems}
          accent={rightColor}
          beat={beats?.[2] ?? null}
          index={1}
          tokens={tokens}
        />
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
