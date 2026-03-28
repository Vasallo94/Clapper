import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { PixelLogo } from "./pixel-art/PixelLogo"
import { PixelSmoke } from "./pixel-art/PixelSmoke"

interface LogoWatermarkProps {
  bottom?: number
  right?: number
  opacity?: number
  logoScale?: number
}

export const LogoWatermark: React.FC<LogoWatermarkProps> = ({
  bottom = 12,
  right = 16,
  opacity = 0.5,
  logoScale = 1.2,
}) => {
  const frame = useCurrentFrame()

  // Fade in over first 30 frames
  const fadeIn = interpolate(frame, [0, 30], [0, opacity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // PixelLogo: 64*scale wide x 96*scale tall
  // Pipe/smoke origin in pixel map: ~column 6, row 55 (of 64x96)
  // That maps to: left offset ~6/64 = 9%, top offset ~55/96 = 57%
  const logoHeight = 96 * logoScale
  const smokeWidth = 20 * logoScale
  const smokeHeight = 24 * logoScale

  // Position smoke to the LEFT of the skull, at pipe height (~57% down)
  const smokeTop = logoHeight * 0.45
  const smokeRight = smokeWidth * 0.25 // slight overlap with skull edge

  return (
    <div
      style={{
        position: "absolute",
        bottom,
        right,
        opacity: fadeIn,
        zIndex: 50,
      }}
    >
      {/* Smoke at the pipe/mouth area — left side, flowing left-upward */}
      <div
        style={{
          position: "absolute",
          top: smokeTop,
          right: `calc(100% - ${smokeRight}px)`,
          width: smokeWidth,
          height: smokeHeight,
        }}
      >
        <PixelSmoke scale={logoScale} frameHold={5} />
      </div>
      {/* Static pixel logo */}
      <PixelLogo scale={logoScale} animation="none" />
    </div>
  )
}
