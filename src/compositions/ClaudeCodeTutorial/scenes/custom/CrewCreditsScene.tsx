import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"

interface CreditEntry {
  role: string
  name: string
}

interface CrewCreditsProps {
  title?: string
  credits?: CreditEntry[]
  producedBy?: string
  footer?: string
}

const normalizeCredits = (raw: unknown): CreditEntry[] => {
  if (!Array.isArray(raw)) return []
  const out: CreditEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const r = item as Record<string, unknown>
    if (typeof r.role === "string" && typeof r.name === "string") out.push({ role: r.role, name: r.name })
  }
  return out
}

const ROW_HEIGHT = 96
const HEADER_BLOCK = 220
const PRODUCED_BLOCK = 260

export const CrewCreditsScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as CrewCreditsProps
  const credits = normalizeCredits(props.credits)
  const { title = "REPARTO", producedBy, footer } = props
  const frame = useCurrentFrame()
  const { durationInFrames, fps, height } = useVideoConfig()
  const tokens = useThemeTokens()

  const contentHeight = HEADER_BLOCK + credits.length * ROW_HEIGHT + (producedBy ? PRODUCED_BLOCK : 0)
  // El scroll arranca tras una pausa de 1s y termina 1s antes del final
  const scrollStart = fps
  const scrollEnd = durationInFrames - fps
  const y = interpolate(frame, [scrollStart, scrollEnd], [height * 0.78, -contentHeight], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill style={{ background: tokens.backgroundGradient, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: height * 0.07,
          background: "#000",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: height * 0.07,
          background: "#000",
          zIndex: 2,
        }}
      />

      <div style={{ position: "absolute", left: 0, right: 0, transform: `translateY(${y}px)`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: tokens.monoFontFamily,
            fontSize: 22,
            letterSpacing: 10,
            color: tokens.primary,
            marginBottom: 18,
          }}
        >
          {title}
        </div>
        <div style={{ width: 120, height: 2, background: tokens.accentLine, margin: "0 auto 90px" }} />

        {credits.map((c, i) => (
          <div key={i} style={{ height: ROW_HEIGHT }}>
            <div
              style={{
                fontFamily: tokens.monoFontFamily,
                fontSize: 15,
                letterSpacing: 5,
                color: tokens.foregroundMid,
                textTransform: "uppercase",
              }}
            >
              {c.role}
            </div>
            <div style={{ fontFamily: tokens.fontFamily, fontSize: 38, fontWeight: 700, color: tokens.foreground }}>
              {c.name}
            </div>
          </div>
        ))}

        {producedBy && (
          <div style={{ marginTop: 110 }}>
            <div
              style={{ fontFamily: tokens.monoFontFamily, fontSize: 15, letterSpacing: 5, color: tokens.foregroundMid }}
            >
              PRODUCE
            </div>
            <div style={{ fontFamily: tokens.fontFamily, fontSize: 44, fontWeight: 700, color: tokens.primary }}>
              {producedBy}
            </div>
            {footer && (
              <div
                style={{ marginTop: 14, fontFamily: tokens.monoFontFamily, fontSize: 16, color: tokens.foregroundLow }}
              >
                {footer}
              </div>
            )}
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}
