// src/compositions/ClaudeCodeTutorial/scenes/OutroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import type { OutroSceneProps } from "../schema"
import { useThemeTokens } from "../themes"
import { MascotWatermark } from "../components/MascotWatermark"
import { useSlideIn } from "../hooks/useSlideIn"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

export const OutroScene: React.FC<OutroSceneProps> = ({ title, bullets, timing, beats }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const titleAnim = useSlideIn({ distance: 30, delay: motionStartFrame, durationInFrames: Math.ceil(fps * 0.8) })
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))
  const labelStartFrame =
    beatStartFrames && beatStartFrames.length > 0
      ? beatStartFrames[beatStartFrames.length - 1] + Math.ceil(fps * 0.35)
      : motionStartFrame + Math.ceil(fps * 1.5)

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
          opacity: titleAnim.opacity,
          transform: `translateY(${titleAnim.y}px)`,
          textAlign: "center",
        }}
      >
        {title}
      </div>

      {bullets && bullets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 700 }}>
          {bullets.map((bullet, i) => {
            const beatStart =
              beatStartFrames?.[Math.min(i, Math.max(0, (beatStartFrames?.length ?? 1) - 1))] ??
              motionStartFrame + Math.ceil(fps * (0.5 + i * 0.25))
            const bulletOpacity = interpolate(frame, [beatStart, beatStart + Math.ceil(fps * 0.4)], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
            const bulletX = interpolate(frame, [beatStart, beatStart + Math.ceil(fps * 0.4)], [-20, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
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
                    fontSize: 22,
                    color: tokens.foreground,
                    opacity: 0.78,
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
          opacity: interpolate(frame, [labelStartFrame, labelStartFrame + Math.ceil(fps * 0.5)], [0, 1], {
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
