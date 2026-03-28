import React from "react"
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { PixelLogo } from "../ClaudeCodeTutorial/components/pixel-art/PixelLogo"

export const PixelLogoPreview: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 40%), linear-gradient(180deg, #05070d 0%, #020305 100%)",
        alignItems: "center",
        justifyContent: "flex-start",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        paddingTop: 170,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 64,
          textAlign: "center",
          opacity: titleOpacity,
        }}
      >
        <div style={{ color: "#f4f7fb", fontSize: 46, fontWeight: 700 }}>Pixel Logo Preview</div>
        <div style={{ color: "rgba(244,247,251,0.65)", fontSize: 20, marginTop: 10 }}>
          Primera pasada del logo convertido a sprite animable
        </div>
      </div>

      <PixelLogo scale={6} animation="glint" />
    </AbsoluteFill>
  )
}
