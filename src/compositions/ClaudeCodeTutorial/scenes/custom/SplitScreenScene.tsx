import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import { CheckIcon, CrossIcon, FolderIcon, UserIcon, CodeIcon } from "./svg-icons"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface PanelConfig {
  label: string
  icon?: "check" | "cross" | "folder" | "user" | "code"
  items: string[]
  accent?: string
}

interface SplitScreenProps {
  title?: string
  left: PanelConfig
  right: PanelConfig
  timing?: Timing
  beats?: Beat[]
}

const iconMap: Record<string, React.FC<{ size?: number; color?: string }>> = {
  check: CheckIcon,
  cross: CrossIcon,
  folder: FolderIcon,
  user: UserIcon,
  code: CodeIcon,
}

export const SplitScreenScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as SplitScreenProps
  const { title, left, right, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Title animation
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleOpacity = interpolate(frame, [titleDelay, titleDelay + Math.ceil(fps * 0.3)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Panel entrance — left from left, right from right
  const panelDelay = beatStartFrames?.[1] ?? motionStartFrame + Math.ceil(fps * 0.3)
  const leftSpring = spring({
    frame: Math.max(0, frame - panelDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.6),
  })
  const rightDelay = panelDelay + Math.ceil(fps * 0.15)
  const rightSpring = spring({
    frame: Math.max(0, frame - rightDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.6),
  })

  const renderPanel = (panel: PanelConfig, side: "left" | "right", panelSpring: number, panelBeatOffset: number) => {
    const accent = panel.accent || tokens.primary
    const IconComponent = panel.icon ? iconMap[panel.icon] : null
    const xDir = side === "left" ? -1 : 1
    const x = interpolate(panelSpring, [0, 1], [40 * xDir, 0])
    const opacity = interpolate(panelSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })

    return (
      <div
        style={{
          flex: 1,
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          borderTop: `3px solid ${accent}`,
          borderRadius: 10,
          padding: "28px 32px",
          opacity,
          transform: `translateX(${x}px)`,
          boxShadow: tokens.card.shadow,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {IconComponent && <IconComponent size={28} color={accent} />}
          <span
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 26,
              fontWeight: 700,
              color: accent,
            }}
          >
            {panel.label}
          </span>
        </div>

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {panel.items.map((item, i) => {
            const itemDelay =
              beatStartFrames?.[panelBeatOffset + i] ?? panelDelay + Math.ceil(fps * 0.4) + i * Math.ceil(fps * 0.2)
            const itemSpring = spring({
              frame: Math.max(0, frame - itemDelay),
              fps,
              config: { damping: 200 },
              durationInFrames: Math.ceil(fps * 0.3),
            })
            const itemOpacity = interpolate(itemSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
            const itemX = interpolate(itemSpring, [0, 1], [15 * xDir, 0])

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  opacity: itemOpacity,
                  transform: `translateX(${itemX}px)`,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: accent,
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: tokens.fontFamily,
                    fontSize: 20,
                    color: tokens.foreground,
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Beat offsets: beat[0]=title, beat[1]=left panel, beat[2+]=left items, then right items
  const leftItemBeatStart = 2
  const rightItemBeatStart = leftItemBeatStart + (left?.items?.length ?? 0)

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
          display: "flex",
          gap: 24,
          width: "100%",
          maxWidth: 1100,
        }}
      >
        {left && renderPanel(left, "left", leftSpring, leftItemBeatStart)}
        {right && renderPanel(right, "right", rightSpring, rightItemBeatStart)}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
