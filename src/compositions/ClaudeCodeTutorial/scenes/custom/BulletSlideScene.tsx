import React from "react"
import { AbsoluteFill, interpolate } from "remotion"
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
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

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
  | "arrow"

interface BulletItem {
  icon?: IconKey
  text: string
}

interface BulletSlideProps {
  title: string
  subtitle?: string
  items?: BulletItem[]
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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const asString = (value: unknown): string => (typeof value === "string" ? value : "")

const normalizeItems = (items: unknown): BulletItem[] => {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (typeof item === "string") return { text: item }
      const record = asRecord(item)
      const icon = asString(record.icon)
      return {
        icon: icon in iconLookup ? (icon as IconKey) : undefined,
        text: asString(record.text) || asString(record.title) || asString(record.label) || asString(record.description),
      }
    })
    .filter((item) => item.text)
}

const BulletItemRow: React.FC<{
  item: BulletItem
  beat: Beat | null
  index: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ item, beat, index, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 200 + index * 150,
    animationMs: 250,
  })

  const IconComponent = item.icon ? iconLookup[item.icon] : null

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
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
}

export const BulletSlideScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BulletSlideProps
  const { title, subtitle, beats } = props
  const tokens = useThemeTokens()
  const items = normalizeItems(props.items)

  const phase1 = usePhase1Entry({ durationMs: 100 })

  const lineWidth = interpolate(phase1.progress, [0.3, 1], [0, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

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
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 40,
          fontWeight: 700,
          color: tokens.foreground,
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
        }}
      >
        {title}
      </div>

      <div
        style={{
          width: lineWidth,
          height: 3,
          background: tokens.primary,
          borderRadius: 2,
          marginBottom: 8,
        }}
      />

      {subtitle && (
        <div
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: 22,
            color: tokens.foreground,
            opacity: phase1.opacity * 0.7,
            marginBottom: 16,
          }}
        >
          {subtitle}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {items.map((item, i) => (
          <BulletItemRow key={i} item={item} beat={beats?.[i + 1] ?? null} index={i} tokens={tokens} />
        ))}
      </div>

      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
