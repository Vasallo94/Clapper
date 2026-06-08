import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface EtalonProps {
  title?: string
  captions?: string[]
  timing?: Timing
  beats?: Beat[]
}

// Geometry in SVG user units (viewBox 0 0 800 560).
const PLATE_L = 210
const PLATE_R = 590
const CY = 210
const AMP = 110
const BOUNCES = 9

function buildBeamPath(): { d: string; length: number } {
  const pts: Array<[number, number]> = [
    [20, CY],
    [PLATE_L, CY],
  ]
  for (let i = 1; i <= BOUNCES; i++) {
    const x = i % 2 === 1 ? PLATE_R : PLATE_L
    const y = CY + (i % 2 === 1 ? -AMP : AMP)
    pts.push([x, y])
  }
  pts.push([PLATE_R, CY])
  let length = 0
  for (let i = 1; i < pts.length; i++) {
    length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  }
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ")
  return { d, length }
}

const Caption: React.FC<{
  text: string
  beat: Beat | null
  index: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ text, beat, index, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 600 + index * 1400,
    animationMs: 350,
  })
  return (
    <div
      style={{
        fontFamily: tokens.fontFamily,
        fontSize: 30,
        fontWeight: 700,
        color: index === 2 ? tokens.primary : tokens.foreground,
        opacity,
        transform: `translateY(${y}px)`,
        textAlign: "center",
        lineHeight: 1.3,
      }}
    >
      {text}
    </div>
  )
}

export const EtalonScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as EtalonProps
  const { title = "El etalon", captions = [], beats } = props
  const tokens = useThemeTokens()
  const frame = useCurrentFrame()
  const phase1 = usePhase1Entry({ durationMs: 150 })

  const { d, length } = buildBeamPath()

  // Continuous light flow along the bounce path.
  const flowOffset = -((frame * 6) % length)
  // Exit ray (red Hα) pulses continuously.
  const exitPulse = 0.6 + 0.4 * Math.sin(frame / 8)
  // Plates shimmer subtly.
  const plateGlow = 0.5 + 0.2 * Math.sin(frame / 14)

  const beamReveal = interpolate(frame, [10, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 40px",
        gap: 36,
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 46,
          fontWeight: 700,
          color: tokens.foreground,
          textAlign: "center",
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
        }}
      >
        {title}
      </div>

      <svg viewBox="0 0 820 420" style={{ width: "100%", maxWidth: 960, opacity: phase1.opacity }}>
        <defs>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={tokens.foreground} stopOpacity="0.9" />
            <stop offset="70%" stopColor="#e0a93b" stopOpacity="0.9" />
            <stop offset="100%" stopColor={tokens.primary} stopOpacity="1" />
          </linearGradient>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Plates (semi-mirrored glass) */}
        {[PLATE_L, PLATE_R].map((x) => (
          <g key={x}>
            <rect
              x={x - 5}
              y={CY - AMP - 70}
              width={10}
              height={(AMP + 70) * 2}
              rx={4}
              fill={tokens.secondary}
              opacity={plateGlow}
            />
            <rect
              x={x - 5}
              y={CY - AMP - 70}
              width={3}
              height={(AMP + 70) * 2}
              rx={2}
              fill={tokens.foreground}
              opacity={0.25}
            />
          </g>
        ))}

        {/* Faint full bounce path */}
        <path d={d} fill="none" stroke={tokens.foregroundMid} strokeWidth={3} opacity={0.35 * beamReveal} />

        {/* Flowing light along the bounces */}
        <path
          d={d}
          fill="none"
          stroke="url(#beamGrad)"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`120 ${length}`}
          strokeDashoffset={flowOffset}
          opacity={beamReveal}
          filter="url(#glow)"
        />

        {/* Exit Hα ray (red) */}
        <line
          x1={PLATE_R}
          y1={CY}
          x2={800}
          y2={CY}
          stroke={tokens.primary}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={beamReveal * exitPulse}
          filter="url(#glow)"
        />
        <circle cx={802} cy={CY} r={8} fill={tokens.primary} opacity={beamReveal * exitPulse} filter="url(#glow)" />

        {/* Labels */}
        <text
          x={(PLATE_L + PLATE_R) / 2}
          y={CY - AMP - 90}
          fill={tokens.foregroundMid}
          fontSize="22"
          textAnchor="middle"
          fontFamily={tokens.fontFamily}
        >
          dos placas casi perfectas
        </text>
        <text
          x={790}
          y={CY - 24}
          fill={tokens.primary}
          fontSize="24"
          textAnchor="end"
          fontFamily={tokens.fontFamily}
          fontWeight="700"
        >
          656,28 nm
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 130, justifyContent: "flex-start" }}>
        {captions.map((c, i) => (
          <Caption key={i} text={c} beat={beats?.[i + 1] ?? null} index={i} tokens={tokens} />
        ))}
      </div>
    </AbsoluteFill>
  )
}
