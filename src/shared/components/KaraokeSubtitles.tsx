import React from "react"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../themes"

export type WordTimestamp = {
  word: string
  start: number
  end: number
}

interface KaraokeSubtitlesProps {
  timestamps: WordTimestamp[]
  audioDelayFrames: number
  position?: "bottom" | "top"
  fontSize?: number
}

export const KaraokeSubtitles: React.FC<KaraokeSubtitlesProps> = ({
  timestamps,
  audioDelayFrames,
  position = "bottom",
  fontSize = 28,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  if (timestamps.length === 0) return null

  const currentTimeSeconds = Math.max(0, (frame - audioDelayFrames) / fps)

  // Find the currently spoken word
  const activeIndex = timestamps.findIndex(
    (w) => currentTimeSeconds >= w.start - 0.02 && currentTimeSeconds <= w.end + 0.08,
  )

  if (activeIndex < 0) return null

  const activeWord = timestamps[activeIndex]

  // Spring-based entrance for each new word
  const wordStartFrame = audioDelayFrames + Math.round(activeWord.start * fps)
  const framesIntoWord = frame - wordStartFrame

  const entryProgress = spring({
    frame: Math.max(0, framesIntoWord),
    fps,
    config: { damping: 18, stiffness: 200 },
    durationInFrames: 8,
  })

  // Fade out at word end
  const wordEndFrame = audioDelayFrames + Math.round(activeWord.end * fps)
  const fadeOut = interpolate(frame, [wordEndFrame - 2, wordEndFrame + 3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const opacity = Math.min(entryProgress, fadeOut)
  const scale = interpolate(entryProgress, [0, 1], [0.85, 1])

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [position]: 48,
        display: "flex",
        justifyContent: "center",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: tokens.fontFamily,
          fontSize,
          fontWeight: 700,
          color: "#ffffff",
          textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)",
          opacity,
          transform: `scale(${scale})`,
          display: "inline-block",
          letterSpacing: "0.02em",
        }}
      >
        {activeWord.word}
      </span>
    </div>
  )
}
