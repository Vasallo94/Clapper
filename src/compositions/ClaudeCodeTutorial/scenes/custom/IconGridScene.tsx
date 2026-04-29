import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import {
  TerminalIcon,
  CloudIcon,
  CodeIcon,
  FolderIcon,
  ShieldIcon,
  GearIcon,
  UserIcon,
  BookIcon,
  LightbulbIcon,
  LayersIcon,
  LinkIcon,
  CheckIcon,
  FileIcon,
} from "./svg-icons"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

type IconKey =
  | "terminal"
  | "cloud"
  | "code"
  | "folder"
  | "shield"
  | "gear"
  | "user"
  | "book"
  | "lightbulb"
  | "layers"
  | "link"
  | "check"
  | "file"

interface GridItem {
  icon: IconKey
  title: string
  description: string
  accent?: string
}

interface IconGridProps {
  title?: string
  items: GridItem[]
  columns?: 2 | 3 | 4
  timing?: Timing
  beats?: Beat[]
}

const iconLookup: Record<string, React.FC<{ size?: number; color?: string }>> = {
  terminal: TerminalIcon,
  cloud: CloudIcon,
  code: CodeIcon,
  folder: FolderIcon,
  shield: ShieldIcon,
  gear: GearIcon,
  user: UserIcon,
  book: BookIcon,
  lightbulb: LightbulbIcon,
  layers: LayersIcon,
  link: LinkIcon,
  check: CheckIcon,
  file: FileIcon,
}

export const IconGridScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as IconGridProps
  const { title, items = [], columns = 3, timing, beats } = props
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

  const cols = Math.min(columns, items.length)
  const cardWidth = cols === 2 ? 440 : cols === 4 ? 240 : 300
  const gridGap = 24

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
          flexWrap: "wrap",
          gap: gridGap,
          justifyContent: "center",
          maxWidth: cols * cardWidth + (cols - 1) * gridGap + 40,
        }}
      >
        {items.map((item, i) => {
          const itemDelay = beatStartFrames?.[i + beatOffset] ?? motionStartFrame + i * Math.ceil(fps * 0.2)
          const itemSpring = spring({
            frame: Math.max(0, frame - itemDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.5),
          })
          const itemOpacity = interpolate(itemSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const itemY = interpolate(itemSpring, [0, 1], [25, 0])

          const accent = item.accent || tokens.primary
          const IconComponent = iconLookup[item.icon] || CodeIcon

          return (
            <div
              key={i}
              style={{
                width: cardWidth,
                background: tokens.card.bg,
                border: `1px solid ${tokens.card.border}`,
                borderRadius: 10,
                padding: "24px 20px",
                opacity: itemOpacity,
                transform: `translateY(${itemY}px)`,
                boxShadow: tokens.card.shadow,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: `${accent}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconComponent size={24} color={accent} />
              </div>

              {/* Title */}
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 20,
                  fontWeight: 700,
                  color: tokens.foreground,
                }}
              >
                {item.title}
              </div>

              {/* Description */}
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 16,
                  color: tokens.foreground,
                  opacity: 0.7,
                  lineHeight: 1.5,
                }}
              >
                {item.description}
              </div>
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
