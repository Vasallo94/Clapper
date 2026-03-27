// src/compositions/ClaudeCodeTutorial/scenes/custom/FlowDiagramScene.tsx
import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"

interface FlowNode {
  id: string
  title: string
  description: string
  color: string
}

interface FlowDiagramProps {
  nodes: FlowNode[]
  introText?: string
  outroText?: string
  showParticle?: boolean
  title?: string
}

const NODE_WIDTH = 270
const NODE_HEIGHT = 110
const NODE_GAP = 50

// Per-node animation phases (in seconds):
// 0.0 - 0.4s: box glows bright
// 0.4 - 0.7s: glow attenuates, orb appears at right edge
// 0.7 - 1.8s: orb travels to next box
// 1.8 - 2.2s: next box glows (handled by next node's cycle)
const NODE_CYCLE_DURATION = 2.0 // seconds per node

export const FlowDiagramScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as FlowDiagramProps
  const { nodes = [], introText, outroText, showParticle = true, title } = props
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const tokens = useThemeTokens()

  const NODE_Y = height / 2 - NODE_HEIGHT / 2

  const totalWidth = nodes.length * NODE_WIDTH + (nodes.length - 1) * NODE_GAP
  const startX = (width - totalWidth) / 2

  // Phase timing
  const introEnd = introText ? Math.ceil(fps * 2.5) : 0
  const nodeStagger = Math.ceil(fps * 0.35)
  const nodesStart = introEnd
  const nodesEnd = nodesStart + nodes.length * nodeStagger + Math.ceil(fps * 0.5)

  // Orb animation starts after all nodes are visible
  const orbStart = nodesEnd + Math.ceil(fps * 0.5)
  const cycleDuration = Math.ceil(fps * NODE_CYCLE_DURATION)
  const orbEnd = orbStart + nodes.length * cycleDuration
  const outroStart = orbEnd + Math.ceil(fps * 0.5)

  // Intro text animation
  const introOpacity = introText
    ? interpolate(frame, [0, Math.ceil(fps * 0.4), introEnd - Math.ceil(fps * 0.3), introEnd], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0

  // Outro text animation
  const outroSpring = spring({
    frame: Math.max(0, frame - outroStart),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })

  // Compute per-node glow and orb state
  const nodeCenter = NODE_Y + NODE_HEIGHT / 2

  // Current orb position and color
  let orbX: number | null = null
  let orbY: number | null = null
  let orbColor: string | null = null
  let orbOpacity = 0

  if (showParticle && frame >= orbStart && frame < orbEnd) {
    const orbFrame = frame - orbStart
    const currentNodeIdx = Math.min(Math.floor(orbFrame / cycleDuration), nodes.length - 1)
    const cycleFrame = orbFrame - currentNodeIdx * cycleDuration
    const cycleProgress = cycleFrame / cycleDuration

    const nodeColor = nodes[currentNodeIdx]?.color ?? tokens.primary
    const nextNodeColor = nodes[currentNodeIdx + 1]?.color ?? nodeColor

    // Orb travel phase: 0.35 - 0.85 of cycle
    if (cycleProgress >= 0.35 && cycleProgress <= 0.85 && currentNodeIdx < nodes.length - 1) {
      const travelProgress = (cycleProgress - 0.35) / 0.5
      const fromX = startX + currentNodeIdx * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH
      const toX = startX + (currentNodeIdx + 1) * (NODE_WIDTH + NODE_GAP)
      orbX = fromX + (toX - fromX) * travelProgress
      orbY = nodeCenter

      // Color interpolation: start with current node color, blend to next
      const r1 = parseInt(nodeColor.slice(1, 3), 16)
      const g1 = parseInt(nodeColor.slice(3, 5), 16)
      const b1 = parseInt(nodeColor.slice(5, 7), 16)
      const r2 = parseInt(nextNodeColor.slice(1, 3), 16)
      const g2 = parseInt(nextNodeColor.slice(3, 5), 16)
      const b2 = parseInt(nextNodeColor.slice(5, 7), 16)
      const r = Math.round(r1 + (r2 - r1) * travelProgress)
      const g = Math.round(g1 + (g2 - g1) * travelProgress)
      const b = Math.round(b1 + (b2 - b1) * travelProgress)
      orbColor = `rgb(${r},${g},${b})`

      // Fade in at start, fade out at end
      orbOpacity = interpolate(travelProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    }
  }

  // Compute per-node glow intensity
  function getNodeGlow(nodeIndex: number): { glowIntensity: number; glowColor: string } {
    if (!showParticle || frame < orbStart || frame >= orbEnd) {
      return { glowIntensity: 0, glowColor: nodes[nodeIndex]?.color ?? tokens.primary }
    }
    const orbFrame = frame - orbStart
    const currentNodeIdx = Math.min(Math.floor(orbFrame / cycleDuration), nodes.length - 1)
    const cycleFrame = orbFrame - currentNodeIdx * cycleDuration
    const cycleProgress = cycleFrame / cycleDuration
    const color = nodes[nodeIndex]?.color ?? tokens.primary

    if (nodeIndex === currentNodeIdx) {
      // Current node: glow bright at start of cycle, then fade
      const intensity = interpolate(cycleProgress, [0, 0.15, 0.35, 0.5], [0, 1, 0.3, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      return { glowIntensity: intensity, glowColor: color }
    }

    if (nodeIndex === currentNodeIdx + 1) {
      // Next node: glow when orb arrives (end of travel)
      const intensity = interpolate(cycleProgress, [0.75, 0.9, 1], [0, 1, 0.8], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
      return { glowIntensity: intensity, glowColor: color }
    }

    // Already visited: subtle persistent glow
    if (nodeIndex < currentNodeIdx) {
      return { glowIntensity: 0.15, glowColor: color }
    }

    return { glowIntensity: 0, glowColor: color }
  }

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: 48,
            fontFamily: tokens.fontFamily,
            fontSize: 32,
            fontWeight: 700,
            color: tokens.foreground,
            opacity: interpolate(frame, [nodesStart, nodesStart + Math.ceil(fps * 0.4)], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {title}
        </div>
      )}

      {/* Intro text overlay */}
      {introText && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: tokens.backgroundGradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 80,
            opacity: introOpacity,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 32,
              color: tokens.foreground,
              textAlign: "center",
              maxWidth: 900,
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            {introText}
          </div>
        </div>
      )}

      {/* SVG layer: connection lines + orb */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          pointerEvents: "none",
        }}
      >
        {/* Connection lines between nodes */}
        {nodes.map((_, i) => {
          if (i >= nodes.length - 1) return null
          const x1 = startX + i * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH
          const x2 = startX + (i + 1) * (NODE_WIDTH + NODE_GAP)

          const lineDelay = nodesEnd
          const lineProgress = interpolate(frame, [lineDelay, lineDelay + Math.ceil(fps * 0.6)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
          const currentX2 = x1 + (x2 - x1) * lineProgress

          return (
            <g key={i}>
              <line
                x1={x1 + 4}
                y1={nodeCenter}
                x2={currentX2 - 4}
                y2={nodeCenter}
                stroke={tokens.foregroundLow}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            </g>
          )
        })}

        {/* Orb with glow */}
        {orbX !== null && orbY !== null && orbColor && orbOpacity > 0 && (
          <>
            <circle cx={orbX} cy={orbY} r={18} fill={orbColor} opacity={orbOpacity * 0.2} />
            <circle cx={orbX} cy={orbY} r={10} fill={orbColor} opacity={orbOpacity * 0.5} />
            <circle cx={orbX} cy={orbY} r={5} fill="#ffffff" opacity={orbOpacity * 0.9} />
          </>
        )}
      </svg>

      {/* Nodes */}
      <div
        style={{
          position: "absolute",
          top: NODE_Y,
          left: startX,
          display: "flex",
          gap: NODE_GAP,
        }}
      >
        {nodes.map((node, i) => {
          const delay = nodesStart + i * nodeStagger
          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.5),
          })
          const y = interpolate(s, [0, 1], [20, 0])
          const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

          const { glowIntensity, glowColor } = getNodeGlow(i)
          const isVisited =
            frame >= orbStart &&
            (() => {
              const orbFrame = frame - orbStart
              const currentNodeIdx = Math.min(Math.floor(orbFrame / cycleDuration), nodes.length - 1)
              return i <= currentNodeIdx
            })()
          const borderColor = isVisited || glowIntensity > 0.1 ? node.color : tokens.card.border
          const glowShadow =
            glowIntensity > 0
              ? `0 0 ${30 * glowIntensity}px ${glowColor}${Math.round(glowIntensity * 80)
                  .toString(16)
                  .padStart(2, "0")}, 0 0 ${60 * glowIntensity}px ${glowColor}${Math.round(glowIntensity * 40)
                  .toString(16)
                  .padStart(2, "0")}`
              : tokens.card.shadow

          return (
            <div
              key={node.id}
              style={{
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                background: tokens.card.bg,
                border: `2px solid ${borderColor}`,
                borderRadius: 10,
                padding: "14px 18px",
                opacity,
                transform: `translateY(${y}px)`,
                boxShadow: glowShadow,
              }}
            >
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 19,
                  fontWeight: 700,
                  color: node.color,
                  marginBottom: 6,
                }}
              >
                {node.title}
              </div>
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 15,
                  color: tokens.foregroundMid,
                  lineHeight: 1.4,
                }}
              >
                {node.description}
              </div>
            </div>
          )
        })}
      </div>

      {/* Outro callout */}
      {outroText && frame >= outroStart && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 80,
            right: 80,
            background: `${tokens.card.bg}ee`,
            border: `1px solid ${tokens.card.border}`,
            borderLeft: `4px solid ${tokens.primary}`,
            borderRadius: 10,
            padding: "16px 24px",
            fontFamily: tokens.fontFamily,
            fontSize: 22,
            color: tokens.foreground,
            fontWeight: 500,
            opacity: outroSpring,
            transform: `translateY(${interpolate(outroSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          {outroText}
        </div>
      )}
    </AbsoluteFill>
  )
}
