// src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { IntroSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { PhoneMascot } from "../../../shared/components/PhoneMascot"
import { PixelLogo } from "../../../shared/components/pixel-art/PixelLogo"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../utils/direction"

export const IntroScene: React.FC<IntroSceneProps> = ({ title, subtitle, pixelLogo, timing, beats }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const configuredMotionStart = msToFrames(getSceneMotionDelayMs(timing), fps)
  const firstNarratedBeat = beats?.find((beat) => beat.narration.trim())
  const accentStart = firstNarratedBeat ? getBeatStartFrame(firstNarratedBeat, fps) : configuredMotionStart

  // Lockup: title, subtitle, and logo animate in immediately on scene entry
  const lockupOpacity = interpolate(frame, [0, Math.ceil(fps * 0.16)], [0, 1], {
    extrapolateRight: "clamp",
  })
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 110 },
    durationInFrames: Math.ceil(fps * 0.7),
  })
  const titleY = interpolate(titleSpring, [0, 1], [18, 0])
  const subtitleSpring = spring({
    frame: Math.max(0, frame - Math.ceil(fps * 0.14)),
    fps,
    config: { damping: 20, stiffness: 120 },
    durationInFrames: Math.ceil(fps * 0.55),
  })
  const subtitleY = interpolate(subtitleSpring, [0, 1], [14, 0])

  // Accent line waits for the first narrated beat
  const accentFrame = Math.max(0, frame - accentStart)
  const lineWidth = interpolate(accentFrame, [0, Math.ceil(fps * 0.5)], [0, 120], {
    extrapolateRight: "clamp",
  })

  const showPixelLogo = pixelLogo?.enabled && !tokens.mascot.show
  const logoScale = pixelLogo?.scale ?? 4
  const logoAnimation = pixelLogo?.animation ?? "glint"

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
        <div style={{ marginBottom: 24, opacity: lockupOpacity }}>
          <PhoneMascot scale={1} animation="entry" />
        </div>
      )}

      {showPixelLogo && (
        <div
          style={{
            marginBottom: 8,
            opacity: lockupOpacity,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [10, 0])}px)`,
            position: "relative",
            width: 64 * logoScale,
            height: 96 * logoScale,
          }}
        >
          <div style={{ position: "absolute", inset: 0 }}>
            <PixelLogo scale={logoScale} animation="none" />
          </div>
          {logoAnimation !== "none" && (
            <div style={{ position: "absolute", inset: 0 }}>
              <PixelLogo scale={logoScale} animation={logoAnimation} delayFrames={accentStart} />
            </div>
          )}
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
          opacity: lockupOpacity,
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
          opacity: lockupOpacity,
          transform: `translateY(${titleY}px)`,
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
            opacity: lockupOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  )
}
