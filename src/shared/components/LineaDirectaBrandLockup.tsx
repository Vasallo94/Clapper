import React from "react"
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"

type Animation = "none" | "reveal" | "idle"

interface LineaDirectaBrandLockupProps {
  scale?: number
  animation?: Animation
  inverse?: boolean
  compact?: boolean
}

export const LineaDirectaBrandLockup: React.FC<LineaDirectaBrandLockupProps> = ({
  scale = 1,
  animation = "reveal",
  inverse = false,
  compact = false,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const reveal = animation === "reveal"
  const entry = reveal
    ? spring({ frame, fps, config: { damping: 17, stiffness: 92 }, durationInFrames: Math.ceil(fps * 0.8) })
    : 1
  const opacity = reveal ? interpolate(frame, [0, Math.ceil(fps * 0.22)], [0, 1], { extrapolateRight: "clamp" }) : 1
  const y = reveal ? interpolate(entry, [0, 1], [18, 0]) : 0
  const revealInset = reveal
    ? interpolate(frame, [Math.ceil(fps * 0.12), Math.ceil(fps * 0.75)], [100, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0
  const idleCycle = animation === "idle" ? (frame % (fps * 3)) / (fps * 3) : 0
  const idleY = animation === "idle" ? interpolate(Math.sin(idleCycle * Math.PI * 2), [-1, 1], [1.5, -1.5]) : 0
  const glintX = reveal
    ? interpolate(frame, [Math.ceil(fps * 0.55), Math.ceil(fps * 1.08)], [-90, 520], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : -120

  const width = (compact ? 360 : 520) * scale
  const height = (compact ? 256 : 370) * scale
  const shadow = inverse ? "0 18px 40px rgba(0,0,0,0.34)" : "0 14px 30px rgba(0,0,0,0.16)"

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        opacity,
        transform: `translateY(${y + idleY}px)`,
        filter: `drop-shadow(${shadow})`,
        overflow: "hidden",
        clipPath: `inset(0 ${revealInset}% 0 0)`,
      }}
    >
      <Img
        src={staticFile("branding/linea-directa-logo.svg")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -30 * scale,
          left: glintX * scale,
          width: 42 * scale,
          height: height + 60 * scale,
          background: "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.5) 45%, transparent 100%)",
          transform: "skewX(-18deg)",
          opacity: reveal ? 0.7 : 0,
        }}
      />
    </div>
  )
}
