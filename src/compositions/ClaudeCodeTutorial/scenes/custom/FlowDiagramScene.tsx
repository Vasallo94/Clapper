// src/compositions/ClaudeCodeTutorial/scenes/custom/FlowDiagramScene.tsx
import React from "react"
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { evolvePath, getPointAtLength, getLength } from "@remotion/paths"
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

const NODE_WIDTH = 240
const NODE_HEIGHT = 100
const NODE_GAP = 60

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
  const particleStart = nodesEnd + Math.ceil(fps * 0.3)
  const particleDuration = Math.ceil(fps * nodes.length * 0.8)
  const particleEnd = particleStart + particleDuration
  const outroStart = particleEnd + Math.ceil(fps * 0.5)

  // Build SVG path connecting node centers
  const pathSegments: string[] = []
  const nodeCenter = NODE_Y + NODE_HEIGHT / 2
  for (let i = 0; i < nodes.length - 1; i++) {
    const x1 = startX + i * (NODE_WIDTH + NODE_GAP) + NODE_WIDTH
    const x2 = startX + (i + 1) * (NODE_WIDTH + NODE_GAP)
    if (i === 0) pathSegments.push(`M ${x1} ${nodeCenter}`)
    pathSegments.push(`L ${x2} ${nodeCenter}`)
  }
  const fullPath = pathSegments.join(" ")
  const pathLength = fullPath && pathSegments.length > 0 ? getLength(fullPath) : 0

  // Particle position
  const particleProgress = interpolate(
    frame,
    [particleStart, particleEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  const particlePoint =
    fullPath && pathLength > 0 && showParticle && frame >= particleStart
      ? getPointAtLength(fullPath, particleProgress * pathLength)
      : null

  // Path drawing animation
  const pathDrawProgress = interpolate(
    frame,
    [nodesEnd, nodesEnd + Math.ceil(fps * 0.6)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  // Which node is the particle currently at?
  const activeNodeIndex = Math.floor(particleProgress * nodes.length)

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

  // Compute evolved path props
  const evolvedPathDash = fullPath && pathLength > 0 ? evolvePath(pathDrawProgress, fullPath) : null

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
            fontSize: 24,
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
              fontSize: 28,
              color: tokens.foreground,
              textAlign: "center",
              maxWidth: 800,
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            {introText}
          </div>
        </div>
      )}

      {/* SVG layer: paths + particle */}
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
        {/* Connection path */}
        {evolvedPathDash && (
          <path
            d={fullPath}
            fill="none"
            stroke={tokens.foregroundLow}
            strokeWidth={2}
            strokeDasharray={evolvedPathDash.strokeDasharray}
            strokeDashoffset={evolvedPathDash.strokeDashoffset}
          />
        )}

        {/* Particle glow */}
        {particlePoint && showParticle && frame >= particleStart && (
          <>
            <circle
              cx={particlePoint.x}
              cy={particlePoint.y}
              r={12}
              fill={tokens.primary}
              opacity={0.3}
            />
            <circle
              cx={particlePoint.x}
              cy={particlePoint.y}
              r={6}
              fill={tokens.primary}
            />
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

          const isActive = frame >= particleStart && i <= activeNodeIndex
          const borderColor = isActive ? node.color : tokens.card.border

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
                boxShadow: isActive ? `0 0 20px ${node.color}30` : tokens.card.shadow,
              }}
            >
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 15,
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
                  fontSize: 12,
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
            fontSize: 18,
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
