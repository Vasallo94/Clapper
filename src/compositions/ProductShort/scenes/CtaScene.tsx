import React from "react"
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { z } from "zod"
import { ProductShortConfigSchema } from "../schema"
import { useThemeTokens } from "../../ClaudeCodeTutorial/themes"
import { PhoneMascot } from "../../ClaudeCodeTutorial/components/PhoneMascot"
import { useSlideIn } from "../../ClaudeCodeTutorial/hooks/useSlideIn"

type CtaSceneProps = Extract<
  z.infer<typeof ProductShortConfigSchema>["scenes"][number],
  { type: "cta" }
>

const PULSE_COUNT = 3

export const CtaScene: React.FC<CtaSceneProps> = ({ text, url }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const ctaAnim = useSlideIn({ distance: 30 })

  return (
    <AbsoluteFill
      style={{
        background: tokens.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: "80px 60px",
      }}
    >
      {/* Pulse waves */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {Array.from({ length: PULSE_COUNT }).map((_, i) => {
          const pulseDelay = i * 8
          const pulseSpring = spring({
            frame: Math.max(0, frame - pulseDelay),
            fps,
            config: { damping: 30, mass: 1.5 },
            durationInFrames: 40,
          })
          const pulseScale = interpolate(pulseSpring, [0, 1], [0.2, 1])
          const pulseOpacity = interpolate(
            pulseSpring,
            [0, 0.5, 1],
            [0, 0.3, 0],
          )

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${pulseScale})`,
                width: 600,
                height: 600,
                borderRadius: "50%",
                border: `3px solid ${tokens.primary}`,
                opacity: pulseOpacity,
              }}
            />
          )
        })}
      </div>

      <div style={{ transform: "scale(0.8)" }}>
        <PhoneMascot scale={1.5} animation="ring" />
      </div>

      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 52,
          fontWeight: 700,
          color: tokens.primary,
          textAlign: "center",
          opacity: ctaAnim.opacity,
          transform: `translateY(${ctaAnim.y}px)`,
        }}
      >
        {text}
      </div>

      {url && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 28,
            color: tokens.foregroundMid,
            opacity: ctaAnim.opacity,
          }}
        >
          {url}
        </div>
      )}
    </AbsoluteFill>
  )
}
