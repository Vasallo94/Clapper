import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface BlockDiagramBlock {
  label: string
  detail: string
}

interface BlockDiagramProps {
  title?: string
  blocks: BlockDiagramBlock[]
  timing?: Timing
  beats?: Beat[]
}

export const BlockDiagramScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BlockDiagramProps
  const { blocks = [], title, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const blockWidth = 280
  const blockGap = 60
  const blockMinHeight = 160
  const rowWidth = blocks.length * blockWidth + (blocks.length - 1) * blockGap

  // Title animation on Beat 0
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleOpacity = title
    ? interpolate(frame, [titleDelay, titleDelay + Math.ceil(fps * 0.4)], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0

  const titleY = title
    ? interpolate(spring({ frame: Math.max(0, frame - titleDelay), fps, config: { damping: 20 } }), [0, 1], [20, 0])
    : 0

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        gap: 60,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 42,
            fontWeight: 700,
            color: tokens.foreground,
            textAlign: "center",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: blockGap,
          justifyContent: "center",
          position: "relative",
          width: rowWidth,
          maxWidth: rowWidth,
          minHeight: blockMinHeight,
        }}
      >
        {/* Connection arrows behind blocks */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {blocks.map((_, i) => {
            if (i >= blocks.length - 1) return null

            const y = blockMinHeight / 2
            const x1 = i * (blockWidth + blockGap) + blockWidth
            const x2 = (i + 1) * (blockWidth + blockGap)

            // Connection appears with the target block
            const targetBlockDelay = beatStartFrames?.[i + 2] ?? motionStartFrame + (i + 1) * Math.ceil(fps * 0.4)
            const lineDelay = targetBlockDelay - Math.ceil(fps * 0.15)

            const lineProgress = spring({
              frame: Math.max(0, frame - lineDelay),
              fps,
              config: { damping: 200 },
              durationInFrames: Math.ceil(fps * 0.4),
            })

            const arrowSize = 10
            const lineStartX = x1 + 8
            const arrowTipX = interpolate(lineProgress, [0, 1], [lineStartX, x2 - 4], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
            const arrowBaseX = arrowTipX - arrowSize
            const connectorOpacity = interpolate(lineProgress, [0, 0.08, 1], [0, 1, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })

            if (lineProgress <= 0.01 || arrowBaseX <= lineStartX) return null

            return (
              <g key={i} opacity={connectorOpacity}>
                <line
                  x1={lineStartX}
                  y1={y}
                  x2={arrowBaseX}
                  y2={y}
                  stroke={tokens.primary}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <polygon
                  points={`${arrowTipX},${y} ${arrowBaseX},${y - arrowSize} ${arrowBaseX},${y + arrowSize}`}
                  fill={tokens.primary}
                />
              </g>
            )
          })}
        </svg>

        {blocks.map((block, i) => {
          // Beat index mapping: beat 0 is title, beat 1 is block 1, beat 2 is block 2, etc.
          const delay = beatStartFrames?.[i + 1] ?? motionStartFrame + i * Math.ceil(fps * 0.4)
          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.6),
          })
          const y = interpolate(s, [0, 1], [30, 0])
          const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

          return (
            <div
              key={i}
              style={{
                width: blockWidth,
                minHeight: blockMinHeight,
                background: tokens.card.bg,
                border: `2px solid ${tokens.card.border}`,
                borderTop: `4px solid ${tokens.primary}`,
                borderRadius: 12,
                padding: "24px",
                opacity,
                transform: `translateY(${y}px)`,
                boxShadow: tokens.card.shadow,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 24,
                  fontWeight: 700,
                  color: tokens.primary,
                  marginBottom: 12,
                }}
              >
                {block.label}
              </div>
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 18,
                  color: tokens.foreground,
                  opacity: 0.8,
                  lineHeight: 1.5,
                }}
              >
                {block.detail}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
