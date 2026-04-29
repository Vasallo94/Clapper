import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { BenefitsSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { useSlideIn } from "../../../shared/hooks/useSlideIn"
import { getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

const STAGGER_FRAMES = 10

export const BenefitsScene: React.FC<BenefitsSceneProps> = ({ title, items, timing }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)

  const titleAnim = useSlideIn({ delay: motionStartFrame })

  const accentLineSpring = spring({
    frame: Math.max(0, frame - motionStartFrame - 6),
    fps,
    config: { damping: 200 },
    durationInFrames: 25,
  })
  const accentLineWidth = interpolate(accentLineSpring, [0, 1], [0, 200])

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
        <div style={{ paddingLeft: 24 }}>
          <div
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 48,
              fontWeight: 700,
              color: tokens.foreground,
              opacity: titleAnim.opacity,
            }}
          >
            {title}
          </div>
          <div
            style={{
              height: 3,
              width: accentLineWidth,
              background: tokens.primary,
              borderRadius: 2,
              marginTop: 12,
            }}
          />
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
          const itemScale = interpolate(itemSpring, [0, 1], [0.95, 1])

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                opacity: itemSpring,
                transform: `translateX(${itemX}px) scale(${itemScale})`,
                transformOrigin: "left center",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `${tokens.primary}18`,
                  border: `2px solid ${tokens.primary}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width={24} height={24} viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 8.5l3 3 6-7"
                    stroke={tokens.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
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
