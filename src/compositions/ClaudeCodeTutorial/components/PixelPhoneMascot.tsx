// src/compositions/ClaudeCodeTutorial/components/PixelPhoneMascot.tsx
import React from "react"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"

// Color palette
// 0 = transparent
// 1 = #CC3333 (red body)
// 2 = #1A1A1A (black)
// 3 = #FF5555 (highlight red)
// 4 = #999999 (gray wheel hubcap)

const COLORS: Record<number, string> = {
  1: "#CC3333",
  2: "#1A1A1A",
  3: "#FF5555",
  4: "#999999",
}

// 32x24 pixel grid (row by row, top to bottom)
// 0 = transparent, 1 = red, 2 = black, 3 = highlight, 4 = gray
const PIXEL_GRID: number[][] = [
  // Row 0 — handset left curve top
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 1 — handset receiver top
  [0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0],
  // Row 2
  [0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0],
  // Row 3 — handset body
  [0,0,0,0,0,0,2,2,2,0,0,2,2,2,0,0,0,0,2,2,2,0,0,2,2,2,0,0,0,0,0,0],
  // Row 4 — handset connects across
  [0,0,0,0,0,0,2,2,0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0,2,2,0,0,0,0,0,0],
  // Row 5
  [0,0,0,0,0,0,2,2,0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0,2,2,0,0,0,0,0,0],
  // Row 6 — body top
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  // Row 7
  [0,0,0,0,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,0,0,0,0],
  // Row 8 — dial ring top
  [0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,0,0,0,0],
  // Row 9 — dial ring
  [0,0,0,0,1,1,1,1,1,1,1,2,1,2,1,2,1,2,1,2,1,2,1,1,1,1,1,1,0,0,0,0],
  // Row 10 — dial holes
  [0,0,0,0,1,1,1,1,1,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,1,1,1,1,0,0,0,0],
  // Row 11
  [0,0,0,0,1,1,1,1,1,1,1,2,1,2,1,2,1,2,1,2,1,2,1,1,1,1,1,1,0,0,0,0],
  // Row 12 — center dial
  [0,0,0,0,1,1,1,1,1,1,2,1,2,2,2,2,2,2,2,2,2,1,2,1,1,1,1,1,0,0,0,0],
  // Row 13
  [0,0,0,0,1,1,1,1,1,1,1,2,1,2,1,2,1,2,1,2,1,2,1,1,1,1,1,1,0,0,0,0],
  // Row 14 — dial ring bottom
  [0,0,0,0,1,1,1,1,1,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,1,1,1,1,0,0,0,0],
  // Row 15
  [0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,0,0,0,0],
  // Row 16 — body bottom
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  // Row 17 — base wider
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  // Row 18 — base
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  // Row 19 — base bottom
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  // Row 20 — wheel top
  [0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,0,0],
  // Row 21 — wheel with hubcap
  [0,2,2,2,4,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,4,2,2,2,0],
  // Row 22 — wheel center
  [0,2,2,4,4,4,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,4,4,4,2,2,0],
  // Row 23 — wheel bottom
  [0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,0,0],
]

const PIXEL_SIZE = 4

interface PixelPhoneMascotProps {
  scale?: number
  animate?: boolean
}

export const PixelPhoneMascot: React.FC<PixelPhoneMascotProps> = ({
  scale = 1,
  animate = true,
}) => {
  const currentFrame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const bounceSpring = animate
    ? spring({
        frame: currentFrame % fps,
        fps,
        config: { damping: 8, stiffness: 80, mass: 0.6 },
        durationInFrames: fps,
      })
    : 1

  const translateY = animate
    ? interpolate(bounceSpring, [0, 0.5, 1], [0, -6, 0])
    : 0

  const pixelSize = PIXEL_SIZE * scale
  const width = 32 * pixelSize
  const height = 24 * pixelSize

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        imageRendering: "pixelated",
        transform: `translateY(${translateY}px)`,
      }}
    >
      {PIXEL_GRID.map((row, rowIndex) =>
        row.map((colorIndex, colIndex) => {
          if (colorIndex === 0) return null
          const color = COLORS[colorIndex]
          return (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * pixelSize}
              y={rowIndex * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill={color}
            />
          )
        })
      )}
    </svg>
  )
}
