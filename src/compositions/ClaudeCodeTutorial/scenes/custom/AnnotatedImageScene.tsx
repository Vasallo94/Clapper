import React from "react"
import { AbsoluteFill, Img } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { usePhase1Entry } from "../../../../shared/hooks/usePhase1Entry"
import { useBeatReveal } from "../../../../shared/hooks/useBeatReveal"

interface Annotation {
  x: number
  y: number
  text: string
  position?: "top" | "bottom" | "left" | "right"
}

interface AnnotatedImageProps {
  imageSrc?: string
  imageAlt?: string
  annotations: Annotation[]
  timing?: Timing
  beats?: Beat[]
}

const AnnotationMarker: React.FC<{
  ann: Annotation
  beat: Beat | null
  index: number
  tokens: ReturnType<typeof useThemeTokens>
}> = ({ ann, beat, index, tokens }) => {
  const { opacity, y } = useBeatReveal({
    beat: beat ?? undefined,
    fallbackDelayMs: 400 + index * 300,
    animationMs: 250,
  })

  const pos = ann.position ?? "bottom"
  const offset = getCalloutOffset(pos)

  return (
    <div
      style={{
        position: "absolute",
        left: `${ann.x}%`,
        top: `${ann.y}%`,
        opacity,
        transform: `translateY(${y}px)`,
        zIndex: 10 + index,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: tokens.primary,
          color: tokens.primaryForeground,
          fontSize: 13,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: tokens.fontFamily,
          position: "relative",
        }}
      >
        {index + 1}
        <div
          style={{
            position: "absolute",
            ...offset,
            background: tokens.primary,
            color: tokens.primaryForeground,
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            fontFamily: tokens.fontFamily,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {ann.text}
        </div>
      </div>
    </div>
  )
}

const getCalloutOffset = (pos: string) => {
  switch (pos) {
    case "top":
      return { top: "auto", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    case "bottom":
      return { top: "calc(100% + 8px)", bottom: "auto", left: "50%", transform: "translateX(-50%)" }
    case "left":
      return { top: "50%", right: "calc(100% + 8px)", left: "auto", transform: "translateY(-50%)" }
    case "right":
      return { top: "50%", left: "calc(100% + 8px)", right: "auto", transform: "translateY(-50%)" }
    default:
      return { top: "calc(100% + 8px)", bottom: "auto", left: "50%", transform: "translateX(-50%)" }
  }
}

export const AnnotatedImageScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as AnnotatedImageProps
  const { imageSrc, imageAlt, annotations, beats } = props
  const tokens = useThemeTokens()
  const phase1 = usePhase1Entry({ durationMs: 100 })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
      }}
    >
      <div
        style={{
          position: "relative",
          opacity: phase1.opacity,
          transform: `scale(${phase1.scale})`,
          maxWidth: 900,
          width: "100%",
        }}
      >
        {imageSrc ? (
          <Img
            src={imageSrc}
            style={{
              width: "100%",
              borderRadius: 10,
              border: `1px solid ${tokens.card.border}`,
              boxShadow: tokens.card.shadow,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: 360,
              background: tokens.card.bg,
              borderRadius: 10,
              border: `1px solid ${tokens.card.border}`,
              boxShadow: tokens.card.shadow,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: tokens.foregroundMid,
              fontFamily: tokens.fontFamily,
            }}
          >
            {imageAlt ?? "Image placeholder"}
          </div>
        )}

        {annotations.map((ann, i) => (
          <AnnotationMarker key={i} ann={ann} beat={beats?.[i + 1] ?? null} index={i} tokens={tokens} />
        ))}
      </div>
    </AbsoluteFill>
  )
}
