import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface Block {
  id: string
  title: string
  subtitle: string
  color: string
}

interface Connection {
  from: string
  to: string
}

interface BlockDiagramProps {
  blocks: Block[]
  connections?: Connection[]
  layout?: "horizontal" | "grid"
  title?: string
  timing?: Timing
  beats?: Beat[]
}

export const BlockDiagramScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BlockDiagramProps
  const { blocks = [], connections = [], layout = "horizontal", title, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const isGrid = layout === "grid"
  const cols = isGrid ? 2 : blocks.length
  const staggerDelay = Math.ceil(fps * 0.3)

  const blockWidth = isGrid ? 330 : 290
  const blockGap = isGrid ? 32 : 60
  const blockMinHeight = 156
  const rowWidth = isGrid ? cols * blockWidth + blockGap : blocks.length * blockWidth + (blocks.length - 1) * blockGap
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        gap: 40,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: tokens.foreground,
            textAlign: "center",
            maxWidth: 980,
            opacity: interpolate(frame, [motionStartFrame, motionStartFrame + Math.ceil(fps * 0.4)], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: isGrid ? "wrap" : "nowrap",
          gap: blockGap,
          justifyContent: "center",
          position: "relative",
          width: rowWidth,
          maxWidth: rowWidth,
          minHeight: blockMinHeight,
        }}
      >
        {connections.length > 0 && !isGrid && (
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
            {connections.map((conn, ci) => {
              const fromIdx = blocks.findIndex((b) => b.id === conn.from)
              const toIdx = blocks.findIndex((b) => b.id === conn.to)
              if (fromIdx === -1 || toIdx === -1) return null

              const y = blockMinHeight / 2
              const x1 = fromIdx * (blockWidth + blockGap) + blockWidth
              const x2 = toIdx * (blockWidth + blockGap)

              const lineDelay =
                beatStartFrames?.[blocks.length + ci] ??
                motionStartFrame + Math.max(fromIdx, toIdx) * staggerDelay + Math.ceil(fps * 0.5)
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

              if (lineProgress <= 0.01 || arrowBaseX <= lineStartX) {
                return null
              }

              return (
                <g key={ci} opacity={connectorOpacity}>
                  <line
                    x1={lineStartX}
                    y1={y}
                    x2={arrowBaseX}
                    y2={y}
                    stroke={tokens.foregroundMid}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`${arrowTipX},${y} ${arrowBaseX},${y - arrowSize} ${arrowBaseX},${y + arrowSize}`}
                    fill={tokens.foregroundMid}
                  />
                </g>
              )
            })}
          </svg>
        )}

        {blocks.map((block, i) => {
          const delay = beatStartFrames?.[i] ?? motionStartFrame + i * staggerDelay
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
              key={block.id}
              style={{
                width: blockWidth,
                minHeight: blockMinHeight,
                background: tokens.card.bg,
                border: `1px solid ${tokens.card.border}`,
                borderTop: `3px solid ${block.color}`,
                borderRadius: 10,
                padding: "20px 24px",
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
                  fontSize: 22,
                  fontWeight: 700,
                  color: block.color,
                  marginBottom: 8,
                }}
              >
                {block.title}
              </div>
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 18,
                  color: tokens.foreground,
                  opacity: 0.72,
                  lineHeight: 1.5,
                }}
              >
                {block.subtitle}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
