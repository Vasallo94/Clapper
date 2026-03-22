// src/compositions/ClaudeCodeTutorial/scenes/CalloutScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { z } from "zod"
import { TutorialConfigSchema } from "../schema"

type CalloutSceneProps = Extract<
  z.infer<typeof TutorialConfigSchema>["scenes"][number],
  { type: "callout" }
>

const ORIGIN: Record<"top" | "bottom" | "right", { x: number; y: number }> = {
  top: { x: 0, y: -30 },
  bottom: { x: 0, y: 30 },
  right: { x: 40, y: 0 },
}

export const CalloutScene: React.FC<CalloutSceneProps> = ({
  text,
  position,
  background,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const enterSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 }, durationInFrames: Math.ceil(fps * 0.6) })
  const origin = ORIGIN[position]
  const tx = interpolate(enterSpring, [0, 1], [origin.x, 0])
  const ty = interpolate(enterSpring, [0, 1], [origin.y, 0])
  const opacity = interpolate(enterSpring, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })

  const justify = position === "right" ? "flex-end" : "center"
  const align = position === "top" ? "flex-start" : position === "bottom" ? "flex-end" : "center"

  return (
    <AbsoluteFill
      style={{
        background: background === "overlay" ? "rgba(0,0,0,0.65)" : "#0d1117",
        display: "flex",
        alignItems: align,
        justifyContent: justify,
        padding: 80,
      }}
    >
      <div
        style={{
          maxWidth: 640,
          background: "linear-gradient(135deg, #161b22 0%, #21262d 100%)",
          border: "1px solid #30363d",
          borderLeft: "4px solid #7ee787",
          borderRadius: 10,
          padding: "28px 36px",
          opacity,
          transform: `translate(${tx}px, ${ty}px)`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 22,
            lineHeight: 1.5,
            color: "#f0f6fc",
            fontWeight: 500,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  )
}
