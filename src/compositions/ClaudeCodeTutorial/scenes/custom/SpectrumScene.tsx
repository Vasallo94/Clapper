import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"

interface SpectrumProps {
  title?: string
  value?: string
  caption?: string
  timing?: Timing
  beats?: Beat[]
}

// Real visible spectrum, ~400nm (violet) -> ~700nm (red), matching the website.
const SPECTRUM_GRADIENT =
  "linear-gradient(90deg, #6a00b8 0%, #4400ff 8%, #0040ff 18%, #00b6ff 30%, #00d65a 44%, #b6ff00 56%, #ffe000 68%, #ff8a00 82%, #ff1a00 94%, #b10000 100%)"

// Fraunhofer absorption lines as percent across 400–700nm. Hα is the hero.
const FRAUNHOFER = [3.3, 11.3, 28.7, 39, 63]
const HALPHA_PCT = 85.3

export const SpectrumScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as SpectrumProps
  const { title = "El espectro del Sol", value = "656,28", caption, beats } = props
  const tokens = useThemeTokens()
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const phase1 = usePhase1Entry({ durationMs: 150 })

  // Cursor sweeps from violet to the Hα line, timed to beat[1] ("rojo") if present.
  const sweepStart = 20
  const sweepEnd = beats?.[1] ? getBeatStartFrame(beats[1], fps) + fps : Math.round(fps * 3.5)
  const cursorPct = interpolate(frame, [sweepStart, sweepEnd], [2, HALPHA_PCT], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const arrived = frame >= sweepEnd - 4

  // Hα line + number pulse continuously once reached.
  const pulse = arrived ? 0.7 + 0.3 * Math.sin(frame / 7) : 0.4
  const numberReveal = interpolate(frame, [sweepEnd - 10, sweepEnd + 14], [0, 1], {
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
        padding: "60px 50px",
        gap: 56,
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 42,
          fontWeight: 700,
          color: tokens.foreground,
          textAlign: "center",
          maxWidth: 860,
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
        }}
      >
        {title}
      </div>

      {/* Spectrum bar */}
      <div style={{ position: "relative", width: "100%", maxWidth: 900, opacity: phase1.opacity }}>
        <div
          style={{
            position: "relative",
            height: 120,
            borderRadius: 10,
            background: SPECTRUM_GRADIENT,
            border: `1px solid ${tokens.card.border}`,
            boxShadow: tokens.card.shadow,
            overflow: "hidden",
          }}
        >
          {/* Fraunhofer absorption lines */}
          {FRAUNHOFER.map((p) => (
            <div
              key={p}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${p}%`,
                width: 2,
                background: "rgba(0,0,0,0.55)",
              }}
            />
          ))}
          {/* Hα line — the hero */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${HALPHA_PCT}%`,
              width: 5,
              transform: "translateX(-50%)",
              background: "rgba(22,35,44,0.92)",
              boxShadow: `0 0 ${10 * pulse}px ${4 * pulse}px ${tokens.primary}`,
              opacity: 0.9,
            }}
          />
          {/* Sweeping cursor */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${cursorPct}%`,
              width: 3,
              transform: "translateX(-50%)",
              background: "#fff",
              boxShadow: "0 0 12px 2px rgba(255,255,255,0.9)",
            }}
          />
        </div>
        {/* Hα marker label above the line */}
        <div
          style={{
            position: "absolute",
            top: -34,
            left: `${HALPHA_PCT}%`,
            transform: "translateX(-50%)",
            fontFamily: tokens.fontFamily,
            fontSize: 20,
            fontWeight: 700,
            color: tokens.primary,
            opacity: arrived ? 1 : 0,
            whiteSpace: "nowrap",
          }}
        >
          Hα
        </div>
      </div>

      {/* Big number */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          opacity: numberReveal,
          transform: `translateY(${interpolate(numberReveal, [0, 1], [16, 0])}px)`,
        }}
      >
        <span
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 110,
            fontWeight: 900,
            color: tokens.primary,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span style={{ fontFamily: tokens.fontFamily, fontSize: 48, fontWeight: 700, color: tokens.foregroundMid }}>
          nm
        </span>
      </div>

      {caption && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 24,
            color: tokens.foregroundMid,
            textAlign: "center",
            maxWidth: 760,
            opacity: numberReveal,
          }}
        >
          {caption}
        </div>
      )}
    </AbsoluteFill>
  )
}
