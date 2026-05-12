import React from "react"
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"

type Animation = "none" | "idle" | "ring" | "entry" | "dial"

interface PhoneMascotProps {
  scale?: number
  animation?: Animation
  darkBg?: boolean
}

export const PhoneMascot: React.FC<PhoneMascotProps> = ({ scale = 1, animation = "none", darkBg = false }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const isEntry = animation === "entry"
  const entryProgress = isEntry
    ? spring({ frame, fps, config: { damping: 15, stiffness: 88 }, durationInFrames: Math.ceil(fps * 0.85) })
    : 1
  const entryX = isEntry ? interpolate(entryProgress, [0, 1], [-140, 0]) : 0
  const entryY = isEntry ? interpolate(entryProgress, [0, 1], [18, 0]) : 0
  const entryOpacity = isEntry ? interpolate(entryProgress, [0, 0.24], [0, 1], { extrapolateRight: "clamp" }) : 1

  const isIdle = animation === "idle" || (isEntry && frame > Math.ceil(fps * 0.9))
  const idleCycle = isIdle ? (frame % (fps * 2.6)) / (fps * 2.6) : 0
  const idleScale = isIdle ? interpolate(Math.sin(idleCycle * Math.PI * 2), [-1, 1], [0.99, 1.012]) : 1
  const idleY = isIdle ? interpolate(Math.sin(idleCycle * Math.PI * 2), [-1, 1], [1.5, -1.5]) : 0

  const isRing = animation === "ring"
  const ringCycle = isRing ? frame % 4 : 0
  const ringX = isRing ? interpolate(ringCycle, [0, 1, 2, 3], [2.5, -2.5, 1.5, -1.5]) : 0
  const ringRotate = isRing ? interpolate(ringCycle, [0, 1, 2, 3], [-0.8, 0.8, -0.5, 0.5]) : 0

  const isDial = animation === "dial"
  const dialPulse = isDial ? interpolate(frame % 36, [0, 8, 36], [1, 1.025, 1], { extrapolateRight: "clamp" }) : 1
  const glintX = isEntry
    ? interpolate(frame, [Math.ceil(fps * 0.55), Math.ceil(fps * 1.08)], [-80, 430], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : -120

  const width = 260 * scale
  const height = 138 * scale
  const shadow = darkBg ? "0 16px 34px rgba(0,0,0,0.32)" : "0 14px 28px rgba(0,0,0,0.2)"

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        opacity: entryOpacity,
        transform: `translate(${entryX + ringX}px, ${entryY + idleY}px) rotate(${ringRotate}deg) scale(${
          idleScale * dialPulse
        })`,
        transformOrigin: "50% 78%",
        filter: `drop-shadow(${shadow})`,
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile("branding/linea-directa-phone.png")}
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
          top: -20 * scale,
          left: glintX * scale,
          width: 38 * scale,
          height: 190 * scale,
          background: "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.55) 45%, transparent 100%)",
          transform: "skewX(-18deg)",
          opacity: isEntry ? 0.75 : 0,
        }}
      />
    </div>
  )
}
