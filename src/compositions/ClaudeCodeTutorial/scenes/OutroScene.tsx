// src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { TutorialConfigSchema } from "../schema"
import { useThemeTokens } from "../themes"
import { MascotWatermark } from "../components/MascotWatermark"

type OutroSceneProps = Extract<
  z.infer<typeof TutorialConfigSchema>["scenes"][number],
  { type: "outro" }
>

export const OutroScene: React.FC<OutroSceneProps> = ({ title, bullets }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const titleSpring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.ceil(fps * 0.8) })
  const titleOpacity = interpolate(titleSpring, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [30, 0])

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        gap: 32,
      }}
    >
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 48,
          fontWeight: 800,
          color: tokens.foreground,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
        }}
      >
        {title}
      </div>

      {bullets && bullets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 700 }}>
          {bullets.map((bullet, i) => {
            const bulletOpacity = interpolate(
              frame,
              [fps * (0.5 + i * 0.25), fps * (0.9 + i * 0.25)],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
            const bulletX = interpolate(
              frame,
              [fps * (0.5 + i * 0.25), fps * (0.9 + i * 0.25)],
              [-20, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  opacity: bulletOpacity,
                  transform: `translateX(${bulletX}px)`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: tokens.primary,
                    flexShrink: 0,
                    marginTop: 8,
                  }}
                />
                <div
                  style={{
                    fontFamily: tokens.fontFamily,
                    fontSize: 20,
                    color: tokens.foregroundMid,
                    lineHeight: 1.5,
                  }}
                >
                  {bullet}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          fontFamily: tokens.fontFamily,
          fontSize: 13,
          color: tokens.labelColor,
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: interpolate(frame, [fps * 1.5, fps * 2], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {tokens.label}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
