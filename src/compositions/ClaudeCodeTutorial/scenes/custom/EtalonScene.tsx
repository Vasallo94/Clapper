import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatById, getBeatStartFrame, msToFrames } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface EtalonProps {
  title?: string
  captions?: string[]
  timing?: Timing
  beats?: Beat[]
}

// Fabry–Pérot geometry in SVG user units (viewBox 0 0 820 480).
// Physics constraints the drawing respects: light enters near-normal incidence
// and bounces between the plates almost horizontally, drifting slightly on each
// pass (vertical plates invert vx, never vy). At every hit on the right plate a
// partial ray is transmitted; those parallel rays only interfere constructively
// at Hα. The non-resonant rest exits reflected back out the entry side. The
// beam never changes color inside — the etalon filters, it does not shift.
const PLATE_L = 340
const PLATE_R = 470
const PLATE_TOP = 70
const PLATE_BOTTOM = 430
const SLOPE = 0.1
const ENTRY: [number, number] = [10, 140]
const SEGMENTS = 14
const EXIT_X = 810

interface Geometry {
  d: string
  totalLength: number
  entryLength: number
  firstHit: [number, number]
  exits: Array<{ point: [number, number]; length: number }>
}

function buildGeometry(): Geometry {
  const firstHit: [number, number] = [PLATE_L, ENTRY[1] + SLOPE * (PLATE_L - ENTRY[0])]
  const drop = SLOPE * (PLATE_R - PLATE_L)
  const pts: Array<[number, number]> = [ENTRY, firstHit]
  for (let i = 1; i <= SEGMENTS; i++) {
    pts.push([i % 2 === 1 ? PLATE_R : PLATE_L, firstHit[1] + i * drop])
  }
  const cumLen: number[] = [0]
  for (let i = 1; i < pts.length; i++) {
    cumLen.push(cumLen[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  }
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ")
  const exits = pts
    .map((point, i) => ({ point, length: cumLen[i], idx: i }))
    .filter(({ idx }) => idx >= 2 && idx % 2 === 0)
    .map(({ point, length }) => ({ point, length }))
  return { d, totalLength: cumLen[cumLen.length - 1], entryLength: cumLen[1], firstHit, exits }
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
  const { fps } = useVideoConfig()
  const phase1 = usePhase1Entry({ durationMs: 150 })

  const { d, totalLength, entryLength, firstHit, exits } = buildGeometry()

  const platesBeat = getBeatById(beats, "plates") ?? beats?.[0]
  const rebotaBeat = getBeatById(beats, "rebota") ?? beats?.[2]
  const reforzadaBeat = getBeatById(beats, "reforzada") ?? beats?.[3]
  const platesFrame = platesBeat ? getBeatStartFrame(platesBeat, fps) : msToFrames(600, fps)
  const rebotaFrame = rebotaBeat ? getBeatStartFrame(rebotaBeat, fps) : msToFrames(2500, fps)
  const reforzadaFrame = reforzadaBeat ? getBeatStartFrame(reforzadaBeat, fps) : msToFrames(7000, fps)

  const platesIn = interpolate(frame, [platesFrame, platesFrame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  // Incident white beam draws up to the first plate, then the bounce path
  // unrolls from the "rebota" beat.
  const entryReveal = interpolate(frame, [platesFrame + 6, platesFrame + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const bounceProgress = interpolate(frame, [rebotaFrame, rebotaFrame + Math.round(fps * 2.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const drawnLength = entryLength * entryReveal + (totalLength - entryLength) * bounceProgress
  // Constructive interference kicks in: transmitted rays brighten together.
  const reinforce = interpolate(frame, [reforzadaFrame, reforzadaFrame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const exitPulse = 0.75 + 0.25 * Math.sin(frame / 8)
  const plateGlow = 0.55 + 0.2 * Math.sin(frame / 14)
  const flowOffset = -((frame * 7) % totalLength)

  const reflectedEnd: [number, number] = [10, firstHit[1] + SLOPE * (PLATE_L - 10)]

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

      <svg viewBox="0 0 820 480" style={{ width: "100%", maxWidth: 960, opacity: phase1.opacity }}>
        <defs>
          <linearGradient id="restGrad" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#58a6e8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7fd49a" stopOpacity="0.7" />
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
          <g key={x} opacity={platesIn}>
            <rect
              x={x - 5}
              y={PLATE_TOP}
              width={10}
              height={PLATE_BOTTOM - PLATE_TOP}
              rx={4}
              fill={tokens.secondary}
              opacity={plateGlow}
            />
            <rect
              x={x - 5}
              y={PLATE_TOP}
              width={3}
              height={PLATE_BOTTOM - PLATE_TOP}
              rx={2}
              fill={tokens.foreground}
              opacity={0.25}
            />
          </g>
        ))}

        {/* White beam: incident ray + near-horizontal bounces (color never changes inside) */}
        <path
          d={d}
          fill="none"
          stroke={tokens.foreground}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={totalLength}
          strokeDashoffset={totalLength - drawnLength}
          opacity={0.85}
          filter="url(#glow)"
        />
        {/* Continuous light flow once the path is drawn */}
        <path
          d={d}
          fill="none"
          stroke={tokens.foreground}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`90 ${totalLength}`}
          strokeDashoffset={flowOffset}
          opacity={bounceProgress * 0.9}
          filter="url(#glow)"
        />

        {/* Partial transmitted rays: one per right-plate hit, parallel, only Hα survives */}
        {exits.map(({ point, length }, i) => {
          const visible = drawnLength >= length
          const opacity = visible ? 0.22 + reinforce * (0.55 + 0.18 * Math.sin(frame / 6 + i)) : 0
          return (
            <line
              key={i}
              x1={point[0]}
              y1={point[1]}
              x2={EXIT_X}
              y2={point[1] + SLOPE * (EXIT_X - point[0])}
              stroke={tokens.primary}
              strokeWidth={3 + 3 * reinforce}
              strokeLinecap="round"
              opacity={opacity}
              filter="url(#glow)"
            />
          )
        })}
        {/* Reinforced Hα halo through the middle of the transmitted fan */}
        {exits.length > 0 && (
          <line
            x1={PLATE_R}
            y1={(exits[0].point[1] + exits[exits.length - 1].point[1]) / 2}
            x2={EXIT_X}
            y2={(exits[0].point[1] + exits[exits.length - 1].point[1]) / 2 + SLOPE * (EXIT_X - PLATE_R)}
            stroke={tokens.primary}
            strokeWidth={18}
            strokeLinecap="round"
            opacity={0.16 * reinforce * exitPulse}
            filter="url(#glow)"
          />
        )}

        {/* Non-resonant rest: reflected back out the entry side (vx flips, vy stays) */}
        <line
          x1={firstHit[0]}
          y1={firstHit[1]}
          x2={reflectedEnd[0]}
          y2={reflectedEnd[1]}
          stroke="url(#restGrad)"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.4 * reinforce}
          filter="url(#glow)"
        />

        {/* Labels */}
        <text
          x={(PLATE_L + PLATE_R) / 2}
          y={52}
          fill={tokens.foregroundMid}
          fontSize="21"
          textAnchor="middle"
          fontFamily={tokens.fontFamily}
          opacity={platesIn}
        >
          separados solo unas micras
        </text>
        <text
          x={14}
          y={118}
          fill={tokens.foregroundMid}
          fontSize="19"
          textAnchor="start"
          fontFamily={tokens.fontFamily}
          opacity={entryReveal}
        >
          toda la luz
        </text>
        <text
          x={EXIT_X - 4}
          y={176}
          fill={tokens.primary}
          fontSize="24"
          textAnchor="end"
          fontFamily={tokens.fontFamily}
          fontWeight="700"
          opacity={reinforce}
        >
          656,28 nm
        </text>
        <text
          x={20}
          y={250}
          fill={tokens.foregroundMid}
          fontSize="19"
          textAnchor="start"
          fontFamily={tokens.fontFamily}
          opacity={0.85 * reinforce}
        >
          el resto se cancela
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
