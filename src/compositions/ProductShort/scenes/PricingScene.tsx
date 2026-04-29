import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { PricingSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

export const PricingScene: React.FC<PricingSceneProps> = ({ price, period, note, variant, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)

  const isDark = variant === "dark"
  const bg = isDark ? tokens.primary : tokens.background
  const priceColor = isDark ? tokens.primaryForeground : tokens.primary
  const textColor = isDark ? `${tokens.primaryForeground}d9` : tokens.foregroundMid

  const priceSpring = spring({
    frame: Math.max(0, frame - motionStartFrame),
    fps,
    config: { damping: 10, mass: 0.6 },
    durationInFrames: 25,
  })
  const priceScale = interpolate(priceSpring, [0, 1], [0.3, 1])

  const detailSpring = spring({
    frame: Math.max(0, frame - motionStartFrame - 10),
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  })

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
          transform: `scale(${priceScale})`,
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
            opacity: detailSpring,
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
            opacity: detailSpring,
            marginTop: 8,
          }}
        >
          {note}
        </div>
      )}
    </AbsoluteFill>
  )
}
