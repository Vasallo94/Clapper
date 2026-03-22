// src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { TutorialConfigSchema } from "../schema"
import { useTheme } from "../ThemeContext"
import { PixelPhoneMascot } from "../components/PixelPhoneMascot"

type IntroSceneProps = Extract<
  z.infer<typeof TutorialConfigSchema>["scenes"][number],
  { type: "intro" }
>

export const IntroScene: React.FC<IntroSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const theme = useTheme()
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

  return (
    <AbsoluteFill
      style={{
        background: isLD ? "#FFFFFF" : "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
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
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: isLD ? "#CC3333" : "#7ee787",
          opacity: titleOpacity,
        }}
      >
        {isLD ? "Línea Directa · Claude Code" : "Claude Code · Tutorial"}
      </div>

      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 56,
          fontWeight: 800,
          color: isLD ? "#1A1A1A" : "#f0f6fc",
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
          background: isLD ? "#CC3333" : "linear-gradient(90deg, #7ee787, #79c0ff)",
          borderRadius: 1,
        }}
      />

      {subtitle && (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 22,
            color: isLD ? "#888888" : "#8b949e",
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
