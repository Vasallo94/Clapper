// src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { CalloutSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { MascotWatermark } from "../../../shared/components/MascotWatermark"

const ORIGIN: Record<"top" | "bottom" | "right", { x: number; y: number }> = {
  top: { x: 0, y: -30 },
  bottom: { x: 0, y: 30 },
  right: { x: 40, y: 0 },
}

const ALIGN_MAP: Record<"top" | "bottom" | "right", string> = {
  top: "flex-start",
  bottom: "flex-end",
  right: "center",
}

export const CalloutScene: React.FC<CalloutSceneProps> = ({ text, position, background }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 200 },
    durationInFrames: Math.ceil(fps * 0.6),
  })
  const origin = ORIGIN[position]
  const tx = interpolate(enterSpring, [0, 1], [origin.x, 0])
  const ty = interpolate(enterSpring, [0, 1], [origin.y, 0])
  const opacity = interpolate(enterSpring, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })

  const justify = position === "right" ? "flex-end" : "center"
  const align = ALIGN_MAP[position]

  const bgColor = background === "overlay" ? tokens.overlay : tokens.background

  return (
    <AbsoluteFill
      style={{
        background: bgColor,
        display: "flex",
        alignItems: align,
        justifyContent: justify,
        padding: 80,
      }}
    >
      <div
        style={{
          maxWidth: 640,
          background: tokens.card.bgGradient,
          border: `1px solid ${tokens.card.border}`,
          borderLeft: `4px solid ${tokens.card.accentBorder}`,
          borderRadius: 10,
          padding: "28px 36px",
          opacity,
          transform: `translate(${tx}px, ${ty}px)`,
          boxShadow: tokens.card.shadow,
        }}
      >
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 22,
            lineHeight: 1.5,
            color: tokens.foreground,
            fontWeight: 500,
          }}
        >
          {text}
        </div>
      </div>
      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
