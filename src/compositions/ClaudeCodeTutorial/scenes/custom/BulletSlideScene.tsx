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
  ArrowRightIcon,
} from "./svg-icons"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface BulletItem {
  icon?: string
  text: string
}

interface BulletSlideProps {
  title: string
  subtitle?: string
  items: BulletItem[]
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
  arrow: ArrowRightIcon,
}

export const BulletSlideScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BulletSlideProps
  const { title, subtitle, items = [], timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Title animation
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Subtitle animation
  const subtitleDelay = titleDelay + Math.ceil(fps * 0.15)
  const subtitleOpacity = subtitle
    ? interpolate(frame, [subtitleDelay, subtitleDelay + Math.ceil(fps * 0.3)], [0, 0.7], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0

  // Accent line
  const lineProgress = spring({
    frame: Math.max(0, frame - titleDelay - Math.ceil(fps * 0.1)),
    fps,
    config: { damping: 200 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 60])

  // Beat offset: beat[0]=title, beat[1+]=items
  const itemBeatOffset = 1

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        padding: "60px 80px",
        gap: 12,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 40,
          fontWeight: 700,
          color: tokens.foreground,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </div>

      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          background: tokens.primary,
          borderRadius: 2,
          marginBottom: 8,
        }}
      />

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 22,
            color: tokens.foreground,
            opacity: subtitleOpacity,
            marginBottom: 16,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {items.map((item, i) => {
          const itemDelay =
            beatStartFrames?.[i + itemBeatOffset] ?? motionStartFrame + Math.ceil(fps * 0.4) + i * Math.ceil(fps * 0.2)
          const itemSpring = spring({
            frame: Math.max(0, frame - itemDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.4),
          })
          const itemOpacity = interpolate(itemSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const itemX = interpolate(itemSpring, [0, 1], [-20, 0])

          const IconComponent = item.icon ? iconLookup[item.icon] : null

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: itemOpacity,
                transform: `translateX(${itemX}px)`,
              }}
            >
              {/* Icon or dot */}
              {IconComponent ? (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${tokens.primary}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={20} color={tokens.primary} />
                </div>
              ) : (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: tokens.primary,
                    flexShrink: 0,
                    marginLeft: 14,
                    marginRight: 14,
                  }}
                />
              )}

              <span
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: 24,
                  color: tokens.foreground,
                  lineHeight: 1.4,
                }}
              >
                {item.text}
              </span>
            </div>
          )
        })}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
