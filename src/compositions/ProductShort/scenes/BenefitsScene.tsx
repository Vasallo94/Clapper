import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { BenefitsSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { useSlideIn } from "../../../shared/hooks/useSlideIn"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

const STAGGER_FRAMES = 12

export const BenefitsScene: React.FC<BenefitsSceneProps> = ({ title, items, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)

  const titleAnim = useSlideIn({ delay: motionStartFrame })

  return (
    <AbsoluteFill
      style={{
        background: tokens.background,
        display: "flex",
        flexDirection: "column",
        padding: "120px 60px",
        gap: 40,
      }}
    >
      {/* Accent bar on the left */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 8,
          height: "100%",
          background: tokens.primary,
        }}
      />

      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 48,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: titleAnim.opacity,
            paddingLeft: 24,
          }}
        >
          {title}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 36, paddingLeft: 24 }}>
        {items.map((item, idx) => {
          const itemSpring = spring({
            frame: Math.max(0, frame - motionStartFrame - (idx + 1) * STAGGER_FRAMES),
            fps,
            config: { damping: 200 },
            durationInFrames: 20,
          })
          const itemX = interpolate(itemSpring, [0, 1], [40, 0])

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                opacity: itemSpring,
                transform: `translateX(${itemX}px)`,
              }}
            >
              <div style={{ fontSize: 48, flexShrink: 0 }}>{item.icon}</div>
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 36,
                  fontWeight: 500,
                  color: tokens.foreground,
                  lineHeight: 1.3,
                }}
              >
                {item.text}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
