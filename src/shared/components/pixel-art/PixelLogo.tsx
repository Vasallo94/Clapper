import React from "react"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { pixelSkullMap } from "./pixelSkullMap"

type PixelLogoAnimation = "none" | "build" | "glint" | "pulse"

interface PixelLogoProps {
  scale?: number
  animation?: PixelLogoAnimation
  delayFrames?: number
}

const nonTransparentDigits = new Set(["1", "2", "3", "4", "5"])

export const PixelLogo: React.FC<PixelLogoProps> = ({ scale = 8, animation = "build", delayFrames = 0 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const animationFrame = Math.max(0, frame - delayFrames)

  const buildProgress =
    animation === "build"
      ? spring({
          frame: animationFrame,
          fps,
          config: { damping: 16, stiffness: 90 },
          durationInFrames: Math.ceil(fps * 1.8),
        })
      : 1

  const pulseProgress =
    animation === "pulse" ? interpolate(Math.sin((animationFrame / fps) * Math.PI * 2), [-1, 1], [0.92, 1.05]) : 1

  const glintCenter =
    animation === "glint"
      ? interpolate(animationFrame, [0, Math.ceil(fps * 2.2)], [-18, pixelSkullMap.width + 18], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : -999

  const pixels = pixelSkullMap.data.flatMap((row, y) =>
    row.split("").flatMap((digit, x) => {
      if (!nonTransparentDigits.has(digit)) {
        return []
      }

      const colorIndex = Number(digit)
      const revealOrder = x * 1.15 + y * 0.85
      const revealThreshold = interpolate(buildProgress, [0, 1], [0, pixelSkullMap.width + pixelSkullMap.height], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })

      const visible = animation !== "build" || revealOrder <= revealThreshold
      if (!visible) {
        return []
      }

      const distanceToGlint = Math.abs(x - y * 0.38 - glintCenter)
      const glintBoost =
        animation === "glint"
          ? interpolate(distanceToGlint, [0, 3, 7], [0.28, 0.12, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 0

      return [
        {
          key: `${x}-${y}`,
          x,
          y,
          color: pixelSkullMap.palette[colorIndex],
          opacity: 1,
          brightness: 1 + glintBoost,
        },
      ]
    }),
  )

  return (
    <div
      style={{
        width: pixelSkullMap.width * scale,
        height: pixelSkullMap.height * scale,
        position: "relative",
        transform: `scale(${pulseProgress})`,
        transformOrigin: "center center",
      }}
    >
      {pixels.map((pixel) => (
        <div
          key={pixel.key}
          style={{
            position: "absolute",
            left: pixel.x * scale,
            top: pixel.y * scale,
            width: scale,
            height: scale,
            backgroundColor: pixel.color,
            opacity: pixel.opacity,
            filter: `brightness(${pixel.brightness})`,
            boxShadow: pixel.brightness > 1.05 ? `0 0 ${Math.max(2, scale * 0.5)}px rgba(255,255,255,0.3)` : "none",
          }}
        />
      ))}
    </div>
  )
}
