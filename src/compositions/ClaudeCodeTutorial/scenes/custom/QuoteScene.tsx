import React from "react"
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface QuoteProps {
  text: string
  author?: string
  role?: string
  avatarUrl?: string
  accentColor?: string
  timing?: Timing
  beats?: Beat[]
}

export const QuoteScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as QuoteProps
  const { text, author, role, avatarUrl, accentColor, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const accent = accentColor ?? tokens.primary

  // Quote marks
  const marksDelay = beatStartFrames?.[0] ?? motionStartFrame
  const marksOpacity = interpolate(frame, [marksDelay, marksDelay + Math.ceil(fps * 0.2)], [0, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Quote text
  const textDelay = beatStartFrames?.[1] ?? marksDelay + Math.ceil(fps * 0.15)
  const textSpring = spring({
    frame: Math.max(0, frame - textDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const textOpacity = interpolate(textSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const textScale = interpolate(textSpring, [0, 1], [0.97, 1])

  // Divider line
  const lineDelay = textDelay + Math.ceil(fps * 0.3)
  const lineSpring = spring({
    frame: Math.max(0, frame - lineDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const lineWidth = interpolate(lineSpring, [0, 1], [0, 60])

  // Attribution
  const attrDelay = beatStartFrames?.[2] ?? lineDelay + Math.ceil(fps * 0.15)
  const attrSpring = spring({
    frame: Math.max(0, frame - attrDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const attrOpacity = interpolate(attrSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const attrY = interpolate(attrSpring, [0, 1], [15, 0])

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 100px",
      }}
    >
      {/* Decorative quote marks */}
      <div
        style={{
          fontSize: 120,
          fontFamily: "Georgia, serif",
          color: accent,
          opacity: marksOpacity,
          lineHeight: 0.8,
          marginBottom: -20,
          userSelect: "none",
        }}
      >
        {"\u201C"}
      </div>

      {/* Quote text */}
      <div
        style={{
          fontSize: 28,
          fontStyle: "italic",
          color: tokens.foreground,
          fontFamily: tokens.fontFamily,
          lineHeight: 1.6,
          textAlign: "center",
          maxWidth: 700,
          opacity: textOpacity,
          transform: `scale(${textScale})`,
        }}
      >
        {text}
      </div>

      {/* Divider */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: accent,
          marginTop: 24,
          marginBottom: 24,
        }}
      />

      {/* Attribution */}
      {author && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: attrOpacity,
            transform: `translateY(${attrY}px)`,
          }}
        >
          {avatarUrl && (
            <Img src={avatarUrl} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: tokens.foreground, fontFamily: tokens.fontFamily }}>
              {author}
            </div>
            {role && (
              <div style={{ fontSize: 13, color: tokens.foregroundMid, fontFamily: tokens.fontFamily }}>{role}</div>
            )}
          </div>
        </div>
      )}

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
