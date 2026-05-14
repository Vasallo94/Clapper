import React from "react"
import { AbsoluteFill, Img } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

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

const LogoCell: React.FC<{
  item: LogoItem
  beat: Beat | null
  index: number
  cellWidth: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ item, beat, index, cellWidth, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 200 + index * 100,
    animationMs: 250,
  })

  return (
    <div
      style={{
        width: cellWidth,
        height: 60,
        background: tokens.card.bg,
        border: `1px solid ${tokens.card.border}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateY(${y}px)`,
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
}

export const LogoWallScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as LogoWallProps
  const { title, items, columns, beats } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const cols = columns ?? (items.length <= 3 ? 3 : items.length <= 8 ? 4 : 6)
  const cellWidth = cols === 6 ? 120 : cols === 4 ? 140 : 180
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
            opacity: phase1.opacity,
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
        {items.map((item, i) => (
          <LogoCell
            key={i}
            item={item}
            beat={beats?.[i + beatOffset] ?? null}
            index={i}
            cellWidth={cellWidth}
            tokens={tokens}
          />
        ))}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
