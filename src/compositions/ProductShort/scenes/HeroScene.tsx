import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { HeroSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { PhoneMascot } from "../../../shared/components/PhoneMascot"
import { useSlideIn } from "../../../shared/hooks/useSlideIn"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

export const HeroScene: React.FC<HeroSceneProps> = ({ title, subtitle, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)

  const titleAnim = useSlideIn({ distance: 60, delay: motionStartFrame })
  const subtitleAnim = useSlideIn({ distance: 30, delay: motionStartFrame + 8 })

  const mascotSpring = spring({
    frame: Math.max(0, frame - motionStartFrame - 4),
    fps,
    config: { damping: 12, mass: 0.8 },
    durationInFrames: 30,
  })
  const mascotY = interpolate(mascotSpring, [0, 1], [200, 0])

  const accentSpring = spring({
    frame: Math.max(0, frame - motionStartFrame - 14),
    fps,
    config: { damping: 200 },
    durationInFrames: 25,
  })
  const accentWidth = interpolate(accentSpring, [0, 1], [0, 80])

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
          opacity: mascotSpring,
          transform: `translateY(${mascotY}px)`,
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
            opacity: titleAnim.opacity,
            transform: `translateY(${titleAnim.y}px)`,
          }}
        >
          {title}
        </div>
        <div
          style={{
            height: 4,
            width: accentWidth,
            background: tokens.primaryForeground,
            borderRadius: 2,
            marginTop: 16,
            opacity: accentSpring,
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
            opacity: subtitleAnim.opacity,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  )
}
