import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

const CheckIcon = ({ size, color }: { size: number; color: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const CrossIcon = ({ size, color }: { size: number; color: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

interface ColumnData {
  header: string
  items: string[]
}

interface ComparisonTableProps {
  title: string
  leftColumn: ColumnData
  rightColumn: ColumnData
  timing?: Timing
  beats?: Beat[]
}

export const ComparisonTableScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ComparisonTableProps
  const { title, leftColumn, rightColumn, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Beat 0: Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({ frame: Math.max(0, frame - titleDelay), fps, config: { damping: 20 } })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Beat 1: Right column (Errores comunes)
  const rightColDelay = beatStartFrames?.[1] ?? titleDelay + Math.ceil(fps * 2)
  const rightColSpring = spring({ frame: Math.max(0, frame - rightColDelay), fps, config: { damping: 20 } })
  const rightColOpacity = interpolate(rightColSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const rightColY = interpolate(rightColSpring, [0, 1], [30, 0])

  // Beat 2: Left column (Buenas prácticas)
  const leftColDelay = beatStartFrames?.[2] ?? rightColDelay + Math.ceil(fps * 2)
  const leftColSpring = spring({ frame: Math.max(0, frame - leftColDelay), fps, config: { damping: 20 } })
  const leftColOpacity = interpolate(leftColSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const leftColY = interpolate(leftColSpring, [0, 1], [30, 0])

  const successColor = "#22c55e"
  const errorColor = "#ef4444"

  const columnStyle = (borderColor: string): React.CSSProperties => ({
    flex: 1,
    background: tokens.card.bg,
    border: `2px solid ${tokens.card.border}`,
    borderTop: `6px solid ${borderColor}`,
    borderRadius: 12,
    padding: "32px",
    boxShadow: tokens.card.shadow,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    backgroundColor: `${borderColor}08`, // subtle background tint
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
        gap: 48,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 42,
          fontWeight: 700,
          color: tokens.foreground,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>

      {/* Columns Container */}
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: 1000,
          gap: 40,
        }}
      >
        {/* Left Column (Buenas Prácticas) */}
        <div
          style={{
            ...columnStyle(successColor),
            opacity: leftColOpacity,
            transform: `translateY(${leftColY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 26,
              fontWeight: 700,
              color: successColor,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {leftColumn.header}
          </div>
          {leftColumn.items.map((item, i) => {
            // Stagger items slightly after column appears
            const itemDelay = leftColDelay + Math.ceil(fps * 0.2) + i * Math.ceil(fps * 0.1)
            const itemSpring = spring({ frame: Math.max(0, frame - itemDelay), fps, config: { damping: 20 } })
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  opacity: interpolate(itemSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
                  transform: `translateX(${interpolate(itemSpring, [0, 1], [-15, 0])}px)`,
                }}
              >
                <div style={{ marginTop: 2 }}>
                  <CheckIcon size={24} color={successColor} />
                </div>
                <div style={{ fontFamily: tokens.fontFamily, fontSize: 20, color: tokens.foreground, lineHeight: 1.4 }}>
                  {item}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column (Errores Comunes) */}
        <div
          style={{
            ...columnStyle(errorColor),
            opacity: rightColOpacity,
            transform: `translateY(${rightColY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 26,
              fontWeight: 700,
              color: errorColor,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {rightColumn.header}
          </div>
          {rightColumn.items.map((item, i) => {
            // Stagger items slightly after column appears
            const itemDelay = rightColDelay + Math.ceil(fps * 0.2) + i * Math.ceil(fps * 0.1)
            const itemSpring = spring({ frame: Math.max(0, frame - itemDelay), fps, config: { damping: 20 } })
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  opacity: interpolate(itemSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
                  transform: `translateX(${interpolate(itemSpring, [0, 1], [15, 0])}px)`,
                }}
              >
                <div style={{ marginTop: 2 }}>
                  <CrossIcon size={24} color={errorColor} />
                </div>
                <div style={{ fontFamily: tokens.fontFamily, fontSize: 20, color: tokens.foreground, lineHeight: 1.4 }}>
                  {item}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
