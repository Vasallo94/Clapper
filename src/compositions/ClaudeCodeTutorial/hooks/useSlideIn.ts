// src/compositions/ClaudeCodeTutorial/hooks/useSlideIn.ts
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"

interface SlideInOptions {
  distance?: number
  delay?: number
  durationInFrames?: number
  damping?: number
}

interface SlideInResult {
  opacity: number
  y: number
  spring: number
}

export function useSlideIn(options: SlideInOptions = {}): SlideInResult {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const {
    distance = 30,
    delay = 0,
    durationInFrames = 20,
    damping = 200,
  } = options

  const delayedFrame = Math.max(0, frame - delay)

  const s = spring({
    frame: delayedFrame,
    fps,
    config: { damping },
    durationInFrames,
  })

  const y = interpolate(s, [0, 1], [distance, 0])
  const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  return { opacity, y, spring: s }
}
