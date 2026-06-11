import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"

interface ClapperboardProps {
  mode?: "action" | "cut"
  title?: string
  subtitle?: string
  configLines?: string[]
}

// Frame del golpe en modo "action": tras el countdown de cine (3-2-1 ≈ 54 frames)
const ACTION_CLAP_FRAME = 66
// En modo "cut" el golpe llega al 72% de la escena
const CUT_CLAP_RATIO = 0.72

const STRIPE = (deg: number, amber: string) =>
  `repeating-linear-gradient(${deg}deg, #14110e 0 26px, ${amber} 26px 52px)`

const Clapper: React.FC<{ clapFrame: number; tokens: ReturnType<typeof useThemeTokens>; label: string }> = ({
  clapFrame,
  tokens,
  label,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Entrada del conjunto (desliza desde abajo)
  const enter = spring({ frame: frame - (clapFrame - 26), fps, config: { damping: 14, stiffness: 120 } })
  // Brazo superior: abierto (-32º) hasta el golpe, cierre seco con spring rígido
  const close = spring({ frame: frame - clapFrame, fps, config: { damping: 22, stiffness: 420 }, durationInFrames: 10 })
  const armAngle = interpolate(close, [0, 1], [-32, 0])
  // Vibración breve del cuerpo tras el golpe
  const shake =
    frame >= clapFrame && frame < clapFrame + 8
      ? Math.sin((frame - clapFrame) * 2.4) * (8 - (frame - clapFrame)) * 0.8
      : 0

  return (
    <div
      style={{
        position: "relative",
        width: 520,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [220, 0]) + shake}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -54,
          left: 0,
          width: 520,
          height: 56,
          background: STRIPE(135, tokens.primary),
          borderRadius: "8px 8px 0 0",
          border: "3px solid #14110e",
          transformOrigin: "14px 100%",
          transform: `rotate(${armAngle}deg)`,
          boxShadow: tokens.card.shadow,
        }}
      />
      <div
        style={{
          width: 520,
          borderRadius: "0 0 12px 12px",
          background: "#14110e",
          border: "3px solid #14110e",
          boxShadow: tokens.card.shadow,
          overflow: "hidden",
        }}
      >
        <div style={{ height: 56, background: STRIPE(45, tokens.secondary) }} />
        <div style={{ padding: "26px 30px 30px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontFamily: tokens.monoFontFamily,
              fontSize: 15,
              letterSpacing: 4,
              color: tokens.foregroundMid,
            }}
          >
            PROD. CLAQUETA
          </div>
          <div style={{ fontFamily: tokens.fontFamily, fontSize: 40, fontWeight: 700, color: tokens.foreground }}>
            {label}
          </div>
          <div
            style={{ display: "flex", gap: 26, fontFamily: tokens.monoFontFamily, fontSize: 14, color: tokens.primary }}
          >
            <span>ESCENA 01</span>
            <span>TOMA ÚNICA</span>
            <span>30 FPS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const FilmLeader: React.FC<{ tokens: ReturnType<typeof useThemeTokens> }> = ({ tokens }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const perDigit = Math.round(fps * 0.6)
  const digit = 3 - Math.min(2, Math.floor(frame / perDigit))
  const sweep = ((frame % perDigit) / perDigit) * 360
  const visible = frame < perDigit * 3

  if (!visible) return null
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 380, height: 380 }}>
        <svg width="380" height="380" viewBox="0 0 380 380">
          <circle cx="190" cy="190" r="170" stroke={tokens.foregroundLow} strokeWidth="2" fill="none" />
          <circle cx="190" cy="190" r="120" stroke={tokens.foregroundLow} strokeWidth="2" fill="none" />
          <line x1="0" y1="190" x2="380" y2="190" stroke={tokens.foregroundLow} strokeWidth="1.5" />
          <line x1="190" y1="0" x2="190" y2="380" stroke={tokens.foregroundLow} strokeWidth="1.5" />
          <line
            x1="190"
            y1="190"
            x2={190 + 170 * Math.cos(((sweep - 90) * Math.PI) / 180)}
            y2={190 + 170 * Math.sin(((sweep - 90) * Math.PI) / 180)}
            stroke={tokens.primary}
            strokeWidth="3"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: tokens.fontFamily,
            fontSize: 170,
            fontWeight: 700,
            color: tokens.foreground,
          }}
        >
          {digit}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export const ClapperboardScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ClapperboardProps
  const { mode = "action", title = "CLAQUETA", subtitle, configLines = [] } = props
  const frame = useCurrentFrame()
  const { fps, durationInFrames, height } = useVideoConfig()
  const tokens = useThemeTokens()

  const clapFrame = mode === "action" ? ACTION_CLAP_FRAME : Math.round(durationInFrames * CUT_CLAP_RATIO)
  const titleIn = spring({ frame: frame - clapFrame - 6, fps, config: { damping: 16 } })
  // Modo cut: scroll lento del config.json de fondo + fundido final a negro
  const scrollY = interpolate(frame, [0, durationInFrames], [0, -configLines.length * 34])
  const fadeOut =
    mode === "cut"
      ? interpolate(frame, [durationInFrames - Math.round(fps * 0.8), durationInFrames], [0, 1], {
          extrapolateLeft: "clamp",
        })
      : 0

  return (
    <AbsoluteFill style={{ background: tokens.backgroundGradient, alignItems: "center", justifyContent: "center" }}>
      {/* letterbox */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: height * 0.07, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: height * 0.07, background: "#000" }} />

      {mode === "cut" && configLines.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "12%",
            left: "8%",
            right: "8%",
            bottom: "12%",
            overflow: "hidden",
            opacity: 0.28,
            maskImage: "linear-gradient(180deg, transparent 0%, black 18%, black 82%, transparent 100%)",
          }}
        >
          <div style={{ transform: `translateY(${scrollY}px)` }}>
            {configLines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: tokens.monoFontFamily,
                  fontSize: 22,
                  lineHeight: "34px",
                  color: tokens.primary,
                  whiteSpace: "pre",
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "action" && <FilmLeader tokens={tokens} />}
      {frame >= clapFrame - 30 && <Clapper clapFrame={clapFrame} tokens={tokens} label={title} />}

      {/* Flash de 3 frames en el golpe — a pantalla completa, fuera del contenedor transformado */}
      {frame >= clapFrame && frame < clapFrame + 3 && <AbsoluteFill style={{ background: "rgba(245,239,224,0.55)" }} />}

      {subtitle && (
        <div
          style={{
            position: "absolute",
            bottom: "11%",
            fontFamily: tokens.monoFontFamily,
            fontSize: 20,
            letterSpacing: 3,
            color: tokens.foregroundMid,
            opacity: titleIn,
          }}
        >
          {subtitle}
        </div>
      )}

      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  )
}
