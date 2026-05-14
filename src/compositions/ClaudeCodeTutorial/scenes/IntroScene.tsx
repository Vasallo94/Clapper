// src/compositions/ClaudeCodeTutorial/scenes/IntroScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import type { IntroSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { LineaDirectaBrandLockup } from "../../../shared/components/LineaDirectaBrandLockup"
import { PixelLogo } from "../../../shared/components/pixel-art/PixelLogo"
import { getBeatStartFrame } from "../../../utils/direction"
import { usePhase1Entry } from "../../../shared/hooks/usePhase1Entry"

export const IntroScene: React.FC<IntroSceneProps> = ({ title, subtitle, pixelLogo, beats }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const phase1 = usePhase1Entry({ durationMs: 100 })
  const firstNarratedBeat = beats?.find((beat) => beat.narration?.trim())
  const accentStart = firstNarratedBeat ? getBeatStartFrame(firstNarratedBeat, fps) : Math.ceil(fps * 0.2)

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
        <div style={{ marginBottom: 2, opacity: phase1.opacity }}>
          <LineaDirectaBrandLockup scale={0.72} animation="reveal" compact />
        </div>
      )}

      {showPixelLogo && (
        <div
          style={{
            marginBottom: 8,
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
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

      {!tokens.mascot.show && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: tokens.primary,
            opacity: phase1.opacity,
          }}
        >
          {tokens.label}
        </div>
      )}

      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 56,
          fontWeight: 800,
          color: tokens.foreground,
          textAlign: "center",
          maxWidth: 900,
          lineHeight: 1.2,
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
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
            opacity: phase1.opacity,
            transform: `scale(${phase1.scale})`,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  )
}
