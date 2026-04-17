import React from "react"
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface LogoItem {
  src?: string
  label?: string
}

interface LogoWallProps {
  title?: string
  items: LogoItem[]
  columns?: 3 | 4 | 6
  timing?: Timing
  beats?: Beat[]
}

export const LogoWallScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as LogoWallProps
  const { title, items, columns, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const cols = columns ?? (items.length <= 3 ? 3 : items.length <= 8 ? 4 : 6)
  const cellWidth = cols === 6 ? 120 : cols === 4 ? 140 : 180

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleOpacity = interpolate(frame, [titleDelay, titleDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const beatOffset = title ? 1 : 0

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 20,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            opacity: titleOpacity,
            marginBottom: 32,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 20,
          maxWidth: (cellWidth + 20) * cols,
        }}
      >
        {items.map((item, i) => {
          const cellDelay =
            beatStartFrames?.[i + beatOffset] ?? motionStartFrame + Math.ceil(fps * 0.2) + i * Math.ceil(fps * 0.1)
          const cellSpring = spring({
            frame: Math.max(0, frame - cellDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.4),
          })
          const cellOpacity = interpolate(cellSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const cellScale = interpolate(cellSpring, [0, 1], [0.7, 1])

          return (
            <div
              key={i}
              style={{
                width: cellWidth,
                height: 60,
                background: tokens.card.bg,
                border: `1px solid ${tokens.card.border}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: cellOpacity,
                transform: `scale(${cellScale})`,
              }}
            >
              {item.src ? (
                <Img src={item.src} style={{ maxWidth: cellWidth - 24, maxHeight: 36, objectFit: "contain" }} />
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    color: tokens.foregroundMid,
                    fontFamily: tokens.fontFamily,
                    fontWeight: 500,
                  }}
                >
                  {item.label ?? "Logo"}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
