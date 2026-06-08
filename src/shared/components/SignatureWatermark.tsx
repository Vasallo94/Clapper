import React from "react"
import { interpolate, useCurrentFrame } from "remotion"
import { useThemeTokens } from "../themes"

interface SignatureWatermarkProps {
  text: string
}

// A discreet author signature in the bottom-right corner. Used as a text-based
// alternative to LogoWatermark for videos that carry an author byline instead of
// a brand logo. Reads typography/colour from the active theme tokens.
export const SignatureWatermark: React.FC<SignatureWatermarkProps> = ({ text }) => {
  const frame = useCurrentFrame()
  const tokens = useThemeTokens()
  const opacity = interpolate(frame, [0, 30], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <div
      style={{
        position: "absolute",
        bottom: 30,
        right: 40,
        opacity,
        zIndex: 50,
        fontFamily: tokens.fontFamily,
        fontSize: 22,
        color: tokens.foregroundMid,
        letterSpacing: "0.02em",
      }}
    >
      {text}
    </div>
  )
}
