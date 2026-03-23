// src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { TutorialConfigSchema } from "../schema"
import { useTheme } from "../ThemeContext"
import { useThemeTokens } from "../themes"
import { PixelPhoneMascot } from "../components/PixelPhoneMascot"

type IntroSceneProps = Extract<
  z.infer<typeof TutorialConfigSchema>["scenes"][number],
  { type: "intro" }
>

export const IntroScene: React.FC<IntroSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const theme = useTheme()
  const tokens = useThemeTokens()
  const isLD = theme === "linea-directa"

  const titleSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: fps })
  const titleY = interpolate(titleSpring, [0, 1], [40, 0])
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  const subtitleOpacity = interpolate(frame, [fps * 0.5, fps * 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const subtitleY = interpolate(frame, [fps * 0.5, fps * 1], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const lineWidth = interpolate(frame, [fps * 0.2, fps * 0.8], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const lineBackground = isLD
    ? tokens.primary
    : `linear-gradient(90deg, ${tokens.primary}, ${tokens.secondary})`

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      {isLD && (
        <div style={{ marginBottom: 24 }}>
          <PixelPhoneMascot scale={1} animate={true} />
        </div>
      )}

      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: tokens.primary,
          opacity: titleOpacity,
        }}
      >
        {tokens.label}
      </div>

      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 56,
          fontWeight: 800,
          color: tokens.foreground,
          textAlign: "center",
          maxWidth: 900,
          lineHeight: 1.2,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>

      <div
        style={{
          width: lineWidth,
          height: 2,
          background: lineBackground,
          borderRadius: 1,
        }}
      />

      {subtitle && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 22,
            color: tokens.foregroundMid,
            textAlign: "center",
            maxWidth: 700,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  )
}
