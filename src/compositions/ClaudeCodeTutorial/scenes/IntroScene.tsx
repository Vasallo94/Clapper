// src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import type { IntroSceneProps } from "../schema"
import { useThemeTokens } from "../themes"
import { PhoneMascot } from "../components/PhoneMascot"
import { useSlideIn } from "../hooks/useSlideIn"

export const IntroScene: React.FC<IntroSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const titleAnim = useSlideIn({ distance: 40, durationInFrames: fps })
  const subtitleAnim = useSlideIn({ distance: 16, delay: Math.ceil(fps * 0.5), durationInFrames: Math.ceil(fps * 0.5) })

  const lineWidth = interpolate(frame, [fps * 0.2, fps * 0.8], [0, 120], {
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
        gap: 20,
      }}
    >
      {tokens.mascot.show && (
        <div style={{ marginBottom: 24 }}>
          <PhoneMascot scale={1} animation="entry" />
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
          opacity: titleAnim.opacity,
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
          opacity: titleAnim.opacity,
          transform: `translateY(${titleAnim.y}px)`,
        }}
      >
        {title}
      </div>

      <div
        style={{
          width: lineWidth,
          height: 2,
          background: tokens.accentLine,
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
            opacity: subtitleAnim.opacity,
            transform: `translateY(${subtitleAnim.y}px)`,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  )
}
