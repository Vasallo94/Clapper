import { interpolate, useCurrentFrame, useVideoConfig } from "remotion"

interface KenBurnsOptions {
  // Zoom growth per second (e.g. 0.012 = +1.2% scale each second).
  zoomPerSecond?: number
  from?: number
  // Total pan in px across the whole scene (applied linearly over `panSeconds`).
  panX?: number
  panY?: number
  panSeconds?: number
  maxScale?: number
}

interface KenBurnsResult {
  scale: number
  x: number
  y: number
  transform: string
}

// Continuous slow zoom + pan so a scene never freezes. Rate is per-second so it
// does not need to know the scene's total duration (which useVideoConfig does not
// expose per-Sequence). Used to keep static imagery alive.
export function useKenBurns(options: KenBurnsOptions = {}): KenBurnsResult {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { zoomPerSecond = 0.012, from = 1, panX = 0, panY = 0, panSeconds = 14, maxScale = 1.3 } = options

  const seconds = frame / fps
  const scale = Math.min(from + seconds * zoomPerSecond, maxScale)
  const panProgress = interpolate(seconds, [0, panSeconds], [0, 1], { extrapolateRight: "clamp" })
  const x = panX * panProgress
  const y = panY * panProgress

  return { scale, x, y, transform: `scale(${scale}) translate(${x}px, ${y}px)` }
}
