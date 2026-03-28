import React from "react"
import { useCurrentFrame } from "remotion"
import { smokeFrames, smokePalette, SMOKE_WIDTH, SMOKE_HEIGHT, SMOKE_FRAME_COUNT } from "./smokeFrames"

interface PixelSmokeProps {
  scale?: number
  /** Frames per sprite frame — higher = slower animation */
  frameHold?: number
}

export const PixelSmoke: React.FC<PixelSmokeProps> = ({ scale = 1, frameHold = 6 }) => {
  const frame = useCurrentFrame()

  // Cycle through sprite frames
  const spriteIndex = Math.floor(frame / frameHold) % SMOKE_FRAME_COUNT

  const currentSpriteFrame = smokeFrames[spriteIndex]

  // Cross-fade between current and next frame for smoother animation
  const nextIndex = (spriteIndex + 1) % SMOKE_FRAME_COUNT
  const nextSpriteFrame = smokeFrames[nextIndex]
  const blendProgress = (frame % frameHold) / frameHold

  // Only render non-transparent pixels from both frames
  const pixels: { x: number; y: number; color: string; opacity: number }[] = []

  // Collect unique pixel positions from both frames
  const seen = new Set<string>()

  for (let y = 0; y < SMOKE_HEIGHT; y++) {
    const row = currentSpriteFrame[y]
    const nextRow = nextSpriteFrame[y]
    for (let x = 0; x < SMOKE_WIDTH; x++) {
      const digit = Number(row[x])
      const nextDigit = Number(nextRow[x])
      if (digit === 0 && nextDigit === 0) continue

      const key = `${x}-${y}`
      if (seen.has(key)) continue
      seen.add(key)

      // Blend current and next frame colors
      const currentOpacity = digit > 0 ? 1 : 0
      const nextOpacity = nextDigit > 0 ? 1 : 0
      const opacity = currentOpacity * (1 - blendProgress) + nextOpacity * blendProgress

      // Use the brighter of the two palette entries
      const paletteIdx = digit > nextDigit ? digit : nextDigit

      pixels.push({ x, y, color: smokePalette[paletteIdx] as string, opacity })
    }
  }

  return (
    <div
      style={{
        width: SMOKE_WIDTH * scale,
        height: SMOKE_HEIGHT * scale,
        position: "relative",
      }}
    >
      {pixels.map((p) => (
        <div
          key={`${p.x}-${p.y}`}
          style={{
            position: "absolute",
            left: p.x * scale,
            top: p.y * scale,
            width: scale,
            height: scale,
            backgroundColor: p.color,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  )
}
