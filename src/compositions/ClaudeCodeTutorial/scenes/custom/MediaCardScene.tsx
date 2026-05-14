import React from "react"
import { AbsoluteFill, Img } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import { MascotWatermark } from "../../../../shared/components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface MediaCardProps {
  imageSrc?: string
  imageAlt?: string
  title: string
  description?: string
  cta?: string
  layout?: "image-left" | "image-right"
  timing?: Timing
  beats?: Beat[]
}

const MediaImage: React.FC<{
  imageSrc?: string
  imageAlt?: string
  beat: Beat | null
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ imageSrc, imageAlt, beat, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 200,
    animationMs: 300,
  })

  return (
    <div style={{ flex: 1, opacity, transform: `translateY(${y}px)` }}>
      {imageSrc ? (
        <Img
          src={imageSrc}
          style={{
            width: "100%",
            height: 240,
            objectFit: "cover",
            borderRadius: 10,
            border: `1px solid ${tokens.card.border}`,
          }}
        />
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

  const imageEl = <MediaImage imageSrc={imageSrc} imageAlt={imageAlt} beat={beats?.[0] ?? null} tokens={tokens} />

  const textEl = (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: tokens.foreground,
          fontFamily: tokens.fontFamily,
          marginBottom: 12,
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 16,
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
      <div style={{ display: "flex", gap: 40, alignItems: "center", width: "100%" }}>
        {isRight ? (
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
