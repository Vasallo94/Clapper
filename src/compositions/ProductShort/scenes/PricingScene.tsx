import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import type { PricingSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { usePhase1Entry } from "../../../shared/hooks/usePhase1Entry"

export const PricingScene: React.FC<PricingSceneProps> = ({ price, period, note, variant }) => {
  const frame = useCurrentFrame()
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const isDark = variant === "dark"
  const bg = isDark ? tokens.primary : tokens.background
  const priceColor = isDark ? tokens.primaryForeground : tokens.primary
  const textColor = isDark ? `${tokens.primaryForeground}d9` : tokens.foregroundMid

  return (
    <AbsoluteFill
      style={{
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {!isDark && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            height: 400,
            borderRadius: "50%",
            border: `4px solid ${tokens.primary}`,
            opacity: interpolate(Math.sin(frame * 0.08), [-1, 1], [0.1, 0.22]),
            boxShadow: `0 0 60px ${tokens.primary}30`,
          }}
        />
      )}

      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 120,
          fontWeight: 900,
          color: priceColor,
          transform: `scale(${phase1.scale})`,
        }}
      >
        {price}
      </div>

      {period && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 36,
            color: textColor,
            opacity: phase1.opacity,
          }}
        >
          {period}
        </div>
      )}

      {note && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 28,
            color: textColor,
            opacity: phase1.opacity,
            marginTop: 8,
          }}
        >
          {note}
        </div>
      )}
    </AbsoluteFill>
  )
}
