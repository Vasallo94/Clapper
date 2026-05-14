import React from "react"
import { AbsoluteFill, interpolate } from "remotion"
import type { BenefitsSceneProps } from "../schema"
import { useThemeTokens } from "../../../shared/themes"
import { usePhase1Entry } from "../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../shared/hooks/useBeatReveal"

const BenefitItem: React.FC<{
  item: { text: string }
  index: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ item, index, tokens }) => {
  const { opacity, y } = useBeatReveal({
    fallbackDelayMs: 200 + index * 150,
    animationMs: 250,
  })
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, opacity, transform: `translateY(${y}px)` }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: `${tokens.primary}18`,
          border: `2px solid ${tokens.primary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width={24} height={24} viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 8.5l3 3 6-7"
            stroke={tokens.primary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        style={{
          fontFamily: tokens.fontFamily,
          fontSize: 36,
          fontWeight: 500,
          color: tokens.foreground,
          lineHeight: 1.3,
        }}
      >
        {item.text}
      </div>
    </div>
  )
}

export const BenefitsScene: React.FC<BenefitsSceneProps> = ({ title, items }) => {
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  return (
    <AbsoluteFill
      style={{
        background: tokens.background,
        display: "flex",
        flexDirection: "column",
        padding: "120px 60px",
        gap: 40,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 8,
          height: "100%",
          background: tokens.primary,
        }}
      />

      {title && (
        <div style={{ paddingLeft: 24 }}>
          <div
            style={{
              fontFamily: tokens.fontFamily,
              fontSize: 48,
              fontWeight: 700,
              color: tokens.foreground,
              opacity: phase1.opacity,
            }}
          >
            {title}
          </div>
          <div
            style={{
              height: 3,
              width: interpolate(phase1.progress, [0.3, 1], [0, 200], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              background: tokens.primary,
              borderRadius: 2,
              marginTop: 12,
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 36, paddingLeft: 24 }}>
        {items.map((item, idx) => (
          <BenefitItem key={idx} item={item} index={idx} tokens={tokens} />
        ))}
      </div>
    </AbsoluteFill>
  )
}
