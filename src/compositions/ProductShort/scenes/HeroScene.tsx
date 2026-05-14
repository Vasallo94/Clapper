import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import type { HeroSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { PhoneMascot } from "../../../shared/components/PhoneMascot"
import { usePhase1Entry } from "../../../shared/hooks/usePhase1Entry"

export const HeroScene: React.FC<HeroSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const breathe = interpolate(frame, [0, 90, 180], [42, 55, 42], { extrapolateRight: "extend" })

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% ${breathe}%, ${tokens.primary}, ${tokens.primary}d0)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: "80px 60px",
      }}
    >
      <div
        style={{
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
        }}
      >
        <PhoneMascot scale={2} animation="entry" darkBg />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 72,
            fontWeight: 800,
            color: tokens.primaryForeground,
            textAlign: "center",
            lineHeight: 1.1,
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
          }}
        >
          {title}
        </div>
        <div
          style={{
            height: 4,
            width: interpolate(phase1.progress, [0.3, 1], [0, 80], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            background: tokens.primaryForeground,
            borderRadius: 2,
            marginTop: 16,
            opacity: phase1.opacity,
          }}
        />
      </div>

      {subtitle && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 36,
            fontWeight: 400,
            color: `${tokens.primaryForeground}e6`,
            textAlign: "center",
            opacity: phase1.opacity,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  )
}
