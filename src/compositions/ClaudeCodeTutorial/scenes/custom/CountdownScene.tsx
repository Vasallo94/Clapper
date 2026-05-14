import React from "react"
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface CountdownProps {
  title?: string
  targetLabel?: string
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
  timing?: Timing
  beats?: Beat[]
}

const CountdownBox: React.FC<{
  value: number
  label: string
  isLast: boolean
  beat: Beat | null
  index: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ value, label, isLast, beat, index, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 150 + index * 100,
    animationMs: 250,
  })

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          color: isLast ? tokens.primary : tokens.foreground,
          fontFamily: tokens.monoFontFamily,
          background: tokens.card.bg,
          border: `1px solid ${isLast ? tokens.primary : tokens.card.border}`,
          borderRadius: 10,
          padding: "8px 20px",
          minWidth: 80,
          textAlign: "center",
          boxShadow: tokens.card.shadow,
        }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: tokens.foregroundMid,
          fontFamily: tokens.fontFamily,
          letterSpacing: 1.5,
        }}
      >
        {label}
      </div>
    </div>
  )
}

const CountdownSeparator: React.FC<{
  beat: Beat | null
  index: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ beat, index, tokens }) => {
  const { opacity } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 150 + index * 100,
    animationMs: 250,
  })

  return (
    <div
      style={{
        fontSize: 48,
        fontWeight: 900,
        color: tokens.foregroundLow,
        fontFamily: tokens.monoFontFamily,
        marginBottom: 24,
        opacity,
      }}
    >
      :
    </div>
  )
}

export const CountdownScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as CountdownProps
  const { title, targetLabel, days = 0, hours = 0, minutes = 0, seconds = 0, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  // Countdown is Phase 2 content animation
  const totalStartSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds
  const elapsedSeconds = Math.max(0, frame / fps)
  const remaining = Math.max(0, totalStartSeconds - elapsedSeconds)

  const d = Math.floor(remaining / 86400)
  const h = Math.floor((remaining % 86400) / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = Math.floor(remaining % 60)

  const segments: { value: number; label: string }[] = []
  if (days > 0) segments.push({ value: d, label: "DAYS" })
  if (days > 0 || hours > 0) segments.push({ value: h, label: "HOURS" })
  segments.push({ value: m, label: "MINS" })
  segments.push({ value: s, label: "SECS" })

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
      {title && (
        <div
          style={{
            fontSize: 18,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: phase1.opacity,
            marginBottom: 24,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            <CountdownBox
              value={seg.value}
              label={seg.label}
              isLast={i === segments.length - 1}
              beat={beats?.[1] ?? null}
              index={i}
              tokens={tokens}
            />
            {i < segments.length - 1 && <CountdownSeparator beat={beats?.[1] ?? null} index={i} tokens={tokens} />}
          </React.Fragment>
        ))}
      </div>

      {targetLabel && (
        <div
          style={{
            fontSize: 18,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: phase1.opacity,
            marginTop: 28,
          }}
        >
          {targetLabel}
        </div>
      )}

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
