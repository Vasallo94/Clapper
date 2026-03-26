import React from "react"
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { useThemeTokens } from "../../themes"

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
}

export const BlockDiagramScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BlockDiagramProps
  const { blocks = [], connections = [], layout = "horizontal", title } = props
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const tokens = useThemeTokens()

  const isGrid = layout === "grid"
  const cols = isGrid ? 2 : blocks.length
  const staggerDelay = Math.ceil(fps * 0.3)

  const blockWidth = isGrid ? 280 : 220
  const blockGap = isGrid ? 24 : 40

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
            fontSize: 28,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: interpolate(frame, [0, fps * 0.4], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {title}
        </div>
      )}

      {/* SVG layer for connection lines */}
      {connections.length > 0 && !isGrid && (
        <svg
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        >
          {connections.map((conn, ci) => {
            const fromIdx = blocks.findIndex((b) => b.id === conn.from)
            const toIdx = blocks.findIndex((b) => b.id === conn.to)
            if (fromIdx === -1 || toIdx === -1) return null

            const totalWidth = blocks.length * blockWidth + (blocks.length - 1) * blockGap
            const startX = (width - totalWidth) / 2
            const y = height / 2
            const x1 = startX + fromIdx * (blockWidth + blockGap) + blockWidth
            const x2 = startX + toIdx * (blockWidth + blockGap)

            const lineDelay = Math.max(fromIdx, toIdx) * staggerDelay + Math.ceil(fps * 0.5)
            const lineProgress = spring({
              frame: Math.max(0, frame - lineDelay),
              fps,
              config: { damping: 200 },
              durationInFrames: Math.ceil(fps * 0.4),
            })

            const currentX2 = interpolate(lineProgress, [0, 1], [x1, x2])

            return (
              <g key={ci}>
                <line
                  x1={x1 + 4}
                  y1={y}
                  x2={currentX2 - 4}
                  y2={y}
                  stroke={tokens.foregroundLow}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                {lineProgress > 0.9 && (
                  <polygon
                    points={`${x2 - 4},${y - 5} ${x2 - 4},${y + 5} ${x2 + 2},${y}`}
                    fill={tokens.foregroundLow}
                    opacity={interpolate(lineProgress, [0.9, 1], [0, 1])}
                  />
                )}
              </g>
            )
          })}
        </svg>
      )}

      {/* Blocks */}
      <div
        style={{
          display: "flex",
          flexWrap: isGrid ? "wrap" : "nowrap",
          gap: blockGap,
          justifyContent: "center",
          maxWidth: isGrid ? cols * blockWidth + blockGap : undefined,
        }}
      >
        {blocks.map((block, i) => {
          const delay = i * staggerDelay
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
                background: tokens.card.bg,
                border: `1px solid ${tokens.card.border}`,
                borderTop: `3px solid ${block.color}`,
                borderRadius: 10,
                padding: "20px 24px",
                opacity,
                transform: `translateY(${y}px)`,
                boxShadow: tokens.card.shadow,
              }}
            >
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 18,
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
                  fontSize: 14,
                  color: tokens.foregroundMid,
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
