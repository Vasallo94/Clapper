import React from "react"
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import { MascotWatermark } from "../../components/MascotWatermark"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

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

export const MediaCardScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as MediaCardProps
  const { imageSrc, imageAlt, title, description, cta, layout = "image-left", timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const isRight = layout === "image-right"

  // Image
  const imgDelay = beatStartFrames?.[0] ?? motionStartFrame
  const imgSpring = spring({
    frame: Math.max(0, frame - imgDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const imgOpacity = interpolate(imgSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const imgScale = interpolate(imgSpring, [0, 1], [0.95, 1])

  // Title
  const titleDelay = beatStartFrames?.[1] ?? imgDelay + Math.ceil(fps * 0.2)
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [15, 0])

  // Description
  const descDelay = beatStartFrames?.[2] ?? titleDelay + Math.ceil(fps * 0.15)
  const descOpacity = interpolate(frame, [descDelay, descDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // CTA
  const ctaDelay = beatStartFrames?.[3] ?? descDelay + Math.ceil(fps * 0.15)
  const ctaSpring = spring({
    frame: Math.max(0, frame - ctaDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.4),
  })
  const ctaOpacity = interpolate(ctaSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const ctaY = interpolate(ctaSpring, [0, 1], [10, 0])

  const imageEl = (
    <div
      style={{
        flex: 1,
        opacity: imgOpacity,
        transform: `scale(${imgScale})`,
      }}
    >
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

  const textEl = (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: tokens.foreground,
          fontFamily: tokens.fontFamily,
          marginBottom: 12,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
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
            opacity: descOpacity,
            marginBottom: 20,
          }}
        >
          {description}
        </div>
      )}
      {cta && (
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
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
          }}
        >
          {cta}
        </div>
      )}
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
