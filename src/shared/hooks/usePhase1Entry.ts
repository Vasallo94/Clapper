// src/shared/hooks/usePhase1Entry.ts
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion"

interface Phase1EntryOptions {
  durationMs?: number
}

interface Phase1EntryResult {
  opacity: number
  scale: number
  progress: number
}

export function usePhase1Entry(options: Phase1EntryOptions = {}): Phase1EntryResult {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const durationMs = Math.min(options.durationMs ?? 150, 200)
  const durationFrames = Math.max(1, Math.round((durationMs / 1000) * fps))

  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const opacity = interpolate(progress, [0, 0.6], [0, 1], { extrapolateRight: "clamp" })
  const scale = interpolate(progress, [0, 1], [0.97, 1], { extrapolateRight: "clamp" })

  return { opacity, scale, progress }
}
