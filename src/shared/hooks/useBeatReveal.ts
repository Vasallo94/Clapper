// src/shared/hooks/useBeatReveal.ts
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import type { Beat } from "../schemas"
import { getBeatStartFrame } from "../../utils/direction"

interface BeatRevealOptions {
  beat?: Beat | null
  fallbackDelayMs?: number
  animationMs?: number
}

interface BeatRevealResult {
  opacity: number
  y: number
  progress: number
  visible: boolean
}

export function useBeatReveal(options: BeatRevealOptions = {}): BeatRevealResult {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const { beat, fallbackDelayMs = 200, animationMs = 300 } = options

  const startFrame = beat ? getBeatStartFrame(beat, fps) : Math.round((fallbackDelayMs / 1000) * fps)

  const durationFrames = Math.max(1, Math.round((animationMs / 1000) * fps))
  const localFrame = Math.max(0, frame - startFrame)

  const s = spring({
    frame: localFrame,
    fps,
    config: { damping: 28, stiffness: 200 },
    durationInFrames: durationFrames,
  })

  const opacity = interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })
  const y = interpolate(s, [0, 1], [15, 0])

  return {
    opacity,
    y,
    progress: s,
    visible: frame >= startFrame,
  }
}
