// src/compositions/ClaudeCodeTutorial/components/MascotWatermark.tsx
import React from "react"
import { useThemeTokens } from "../themes"
import { PhoneMascot } from "./PhoneMascot"

type Animation = "idle" | "dial" | "ring"

interface MascotWatermarkProps {
  animation?: Animation
  darkBg?: boolean
}

export const MascotWatermark: React.FC<MascotWatermarkProps> = ({ animation = "idle", darkBg = false }) => {
  const tokens = useThemeTokens()

  if (!tokens.mascot.show) return null

  return (
    <div
      style={{
        position: "absolute",
        bottom: tokens.mascot.cornerBottom,
        right: tokens.mascot.cornerRight,
        opacity: tokens.mascot.cornerOpacity,
      }}
    >
      <PhoneMascot scale={tokens.mascot.cornerScale} animation={animation} darkBg={darkBg} />
    </div>
  )
}
