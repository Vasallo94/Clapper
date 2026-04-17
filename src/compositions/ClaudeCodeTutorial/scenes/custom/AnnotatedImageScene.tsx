import React from "react"
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

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

export const AnnotatedImageScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as AnnotatedImageProps
  const { imageSrc, imageAlt, annotations, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  // Image entrance
  const imgDelay = beatStartFrames?.[0] ?? motionStartFrame
  const imgSpring = spring({
    frame: Math.max(0, frame - imgDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const imgOpacity = interpolate(imgSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const imgScale = interpolate(imgSpring, [0, 1], [0.97, 1])

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
          opacity: imgOpacity,
          transform: `scale(${imgScale})`,
          maxWidth: 900,
          width: "100%",
        }}
      >
        {/* Image or placeholder */}
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

        {/* Annotations */}
        {annotations.map((ann, i) => {
          const annDelay = beatStartFrames?.[i + 1] ?? imgDelay + Math.ceil(fps * 0.4) * (i + 1)
          const annSpring = spring({
            frame: Math.max(0, frame - annDelay),
            fps,
            config: { damping: 20, stiffness: 180 },
            durationInFrames: Math.ceil(fps * 0.4),
          })
          const annOpacity = interpolate(annSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const annScale = interpolate(annSpring, [0, 1], [0.5, 1])

          const pos = ann.position ?? "bottom"
          const offset = getCalloutOffset(pos)

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${ann.x}%`,
                top: `${ann.y}%`,
                opacity: annOpacity,
                transform: `scale(${annScale})`,
                zIndex: 10 + i,
              }}
            >
              {/* Number circle */}
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
                {i + 1}
                {/* Callout bubble */}
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
        })}
      </div>
    </AbsoluteFill>
  )
}
