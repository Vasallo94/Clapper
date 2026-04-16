import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import { CheckIcon, CrossIcon } from "./svg-icons"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

type CellValue = string | { text: string; type: "check" | "cross" | "text" }

interface TableRow {
  cells: CellValue[]
}

interface ComparisonTableProps {
  title?: string
  headers: string[]
  rows: TableRow[]
  highlightRow?: number
  timing?: Timing
  beats?: Beat[]
}

function getCellText(cell: CellValue): string {
  return typeof cell === "string" ? cell : cell.text
}

function getCellType(cell: CellValue): "check" | "cross" | "text" {
  return typeof cell === "string" ? "text" : cell.type
}

export const ComparisonTableScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as ComparisonTableProps
  const { title, headers = [], rows = [], highlightRow, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))
  const beatOffset = title ? 1 : 0

  // Title animation
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleOpacity = title
    ? interpolate(frame, [titleDelay, titleDelay + Math.ceil(fps * 0.3)], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0

  // Header animation
  const headerDelay = (beatStartFrames?.[beatOffset] ?? motionStartFrame) + Math.ceil(fps * 0.1)
  const headerSpring = spring({
    frame: Math.max(0, frame - headerDelay),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const headerOpacity = interpolate(headerSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

  const colCount = headers.length
  const tableWidth = Math.min(1000, 200 * colCount)

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        gap: 32,
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
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          width: tableWidth,
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: tokens.card.shadow,
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            borderBottom: `2px solid ${tokens.primary}`,
            opacity: headerOpacity,
          }}
        >
          {headers.map((header, i) => (
            <div
              key={i}
              style={{
                flex: i === 0 ? 1.5 : 1,
                padding: "14px 20px",
                fontFamily: tokens.fontFamily,
                fontSize: 18,
                fontWeight: 700,
                color: tokens.primary,
                textAlign: i === 0 ? "left" : "center",
              }}
            >
              {header}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {rows.map((row, ri) => {
          const rowDelay =
            beatStartFrames?.[ri + beatOffset + 1] ?? headerDelay + Math.ceil(fps * 0.3) + ri * Math.ceil(fps * 0.2)
          const rowSpring = spring({
            frame: Math.max(0, frame - rowDelay),
            fps,
            config: { damping: 200 },
            durationInFrames: Math.ceil(fps * 0.3),
          })
          const rowOpacity = interpolate(rowSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const rowX = interpolate(rowSpring, [0, 1], [-15, 0])
          const isHighlighted = highlightRow === ri

          return (
            <div
              key={ri}
              style={{
                display: "flex",
                borderBottom: ri < rows.length - 1 ? `1px solid ${tokens.card.border}` : "none",
                opacity: rowOpacity,
                transform: `translateX(${rowX}px)`,
                background: isHighlighted ? `${tokens.primary}10` : "transparent",
              }}
            >
              {row.cells.map((cell, ci) => {
                const cellType = getCellType(cell)
                const cellText = getCellText(cell)

                return (
                  <div
                    key={ci}
                    style={{
                      flex: ci === 0 ? 1.5 : 1,
                      padding: "12px 20px",
                      fontFamily: ci === 0 ? tokens.fontFamily : tokens.monoFontFamily,
                      fontSize: 17,
                      color: tokens.foreground,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: ci === 0 ? "flex-start" : "center",
                      gap: 8,
                    }}
                  >
                    {cellType === "check" && <CheckIcon size={18} color={tokens.terminal.successColor} />}
                    {cellType === "cross" && <CrossIcon size={18} color="#ff5f57" />}
                    {cellType === "text" && <span>{cellText}</span>}
                    {cellType !== "text" && cellText && <span style={{ fontSize: 15 }}>{cellText}</span>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
