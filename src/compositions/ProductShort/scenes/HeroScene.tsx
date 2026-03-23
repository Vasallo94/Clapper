import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { ProductShortConfigSchema } from "../schema"
import { useThemeTokens } from "../../ClaudeCodeTutorial/themes"
import { PhoneMascot } from "../../ClaudeCodeTutorial/components/PhoneMascot"

type HeroSceneProps = Extract<
  z.infer<typeof ProductShortConfigSchema>["scenes"][number],
  { type: "hero" }
>

export const HeroScene: React.FC<HeroSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const titleSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 })
  const titleY = interpolate(titleSpring, [0, 1], [60, 0])

  const subtitleSpring = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  })

  const mascotSpring = spring({
    frame: Math.max(0, frame - 4),
    fps,
    config: { damping: 12, mass: 0.8 },
    durationInFrames: 30,
  })
  const mascotY = interpolate(mascotSpring, [0, 1], [200, 0])

  return (
    <AbsoluteFill
      style={{
        background: tokens.primary,
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
        <PhoneMascot scale={2} animation="entry" />
      </div>

      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 72,
          fontWeight: 800,
          color: tokens.primaryForeground,
          textAlign: "center",
          lineHeight: 1.1,
          opacity: titleSpring,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 36,
            fontWeight: 400,
            color: `${tokens.primaryForeground}e6`,
            textAlign: "center",
            opacity: subtitleSpring,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  )
}
