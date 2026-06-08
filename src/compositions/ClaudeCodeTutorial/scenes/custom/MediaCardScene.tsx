import React from "react"
import { AbsoluteFill, Img } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { resolveAssetSrc } from "../../../../shared/resolveAssetSrc"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"
import { useKenBurns } from "../../../../shared/hooks/useKenBurns"

interface MediaCardProps {
  imageSrc?: string
  imageAlt?: string
  title: string
  description?: string
  cta?: string
  layout?: "image-left" | "image-right" | "image-top"
  timing?: Timing
  beats?: Beat[]
}

const MediaImage: React.FC<{
  imageSrc?: string
  imageAlt?: string
  beat: Beat | null
  tokens: ReturnType<typeof useThemeTokens>
  height?: number
}> = ({ imageSrc, imageAlt, beat, tokens, height = 240 }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 200,
    animationMs: 300,
  })
  const kb = useKenBurns({ zoomPerSecond: 0.008, from: 1.02, maxScale: 1.16 })

  return (
    <div style={{ flex: 1, width: "100%", opacity, transform: `translateY(${y}px)` }}>
      {imageSrc ? (
        <div
          style={{
            width: "100%",
            height,
            borderRadius: 10,
            overflow: "hidden",
            border: `1px solid ${tokens.card.border}`,
            boxShadow: tokens.card.shadow,
          }}
        >
          <Img
            src={resolveAssetSrc(imageSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${kb.scale})`,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: 240,
            background: tokens.card.bg,
            borderRadius: 10,
            border: `1px solid ${tokens.card.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
          }}
        >
          {imageAlt ?? "Image"}
        </div>
      )}
    </div>
  )
}

const MediaCta: React.FC<{
  text: string
  beat: Beat | null
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ text, beat, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 600,
    animationMs: 250,
  })

  return (
    <div
      style={{
        display: "inline-block",
        background: tokens.primary,
        color: tokens.primaryForeground,
        fontSize: 14,
        fontWeight: 600,
        padding: "10px 24px",
        borderRadius: 6,
        fontFamily: tokens.fontFamily,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {text}
    </div>
  )
}

export const MediaCardScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as MediaCardProps
  const { imageSrc, imageAlt, title, description, cta, layout = "image-left", beats } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  const isRight = layout === "image-right"
  const isTop = layout === "image-top"

  const imageEl = (
    <MediaImage
      imageSrc={imageSrc}
      imageAlt={imageAlt}
      beat={beats?.[0] ?? null}
      tokens={tokens}
      height={isTop ? 620 : 240}
    />
  )

  const textEl = (
    <div style={{ flex: 1, textAlign: isTop ? "center" : "left" }}>
      <div
        style={{
          fontSize: isTop ? 46 : 28,
          fontWeight: 700,
          color: tokens.foreground,
          fontFamily: tokens.fontFamily,
          marginBottom: isTop ? 18 : 12,
          lineHeight: 1.2,
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: isTop ? 26 : 16,
            color: tokens.foregroundMid,
            fontFamily: tokens.fontFamily,
            lineHeight: 1.6,
            opacity: phase1.opacity,
            marginBottom: 20,
          }}
        >
          {description}
        </div>
      )}
      {cta && <MediaCta text={cta} beat={beats?.[3] ?? null} tokens={tokens} />}
    </div>
  )

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isTop ? "column" : "row",
          gap: isTop ? 56 : 40,
          alignItems: "center",
          width: "100%",
          maxWidth: isTop ? 860 : undefined,
        }}
      >
        {isTop ? (
          <>
            {imageEl}
            {textEl}
          </>
        ) : isRight ? (
          <>
            {textEl}
            {imageEl}
          </>
        ) : (
          <>
            {imageEl}
            {textEl}
          </>
        )}
      </div>
      <MascotWatermark animation="idle" />
    </AbsoluteFill>
  )
}
