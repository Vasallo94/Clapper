// src/compositions/ClaudeCodeTutorial/components/PhoneMascot.tsx
import React from "react"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"

type Animation = "none" | "idle" | "ring" | "entry" | "dial"

interface PhoneMascotProps {
  scale?: number
  animation?: Animation
  /** Use light outlines for dark backgrounds */
  darkBg?: boolean
}

export const PhoneMascot: React.FC<PhoneMascotProps> = ({
  scale = 1,
  animation = "none",
  darkBg = false,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // --- ENTRY animation: roll in → handset lifts → idle breathing ---
  const isEntry = animation === "entry"

  // Phase 1: Roll in (frames 0 to ~1.2s)
  const entryDuration = Math.ceil(fps * 1.2)
  const entryProgress = isEntry
    ? spring({ frame, fps, config: { damping: 14, stiffness: 80 }, durationInFrames: entryDuration })
    : 1
  const entryX = isEntry ? interpolate(entryProgress, [0, 1], [-160, 0]) : 0
  const entryOpacity = isEntry
    ? interpolate(entryProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
    : 1

  // Entry wheels rotate during slide
  const entryWheelRotation = isEntry
    ? interpolate(entryProgress, [0, 1], [-360, 0])
    : 0

  // Phase 2: Handset lifts (after entry completes, ~1.2s to ~2.2s)
  const liftStart = entryDuration
  const liftFrame = isEntry ? Math.max(0, frame - liftStart) : 0
  const liftProgress = isEntry
    ? spring({ frame: liftFrame, fps, config: { damping: 12, stiffness: 100 }, durationInFrames: Math.ceil(fps * 0.8) })
    : 0
  const handsetLiftY = isEntry ? interpolate(liftProgress, [0, 1], [0, -18]) : 0

  // Phase 3: Idle breathing (after lift completes, ~2.2s+)
  const idleStart = liftStart + Math.ceil(fps * 1)
  const isInIdlePhase = isEntry && frame > idleStart
  const idleFrame = isInIdlePhase ? frame - idleStart : 0

  // --- Standalone IDLE animation ---
  const isIdle = animation === "idle" || isInIdlePhase
  const idleSource = animation === "idle" ? frame : idleFrame
  const idleCycle = isIdle ? (idleSource % (fps * 2)) / (fps * 2) : 0
  const idleScale = isIdle
    ? interpolate(Math.sin(idleCycle * Math.PI * 2), [-1, 1], [0.98, 1.02])
    : 1

  // --- RING animation: handset vibrates + body shakes ---
  const isRing = animation === "ring"
  const ringCycle = isRing ? (frame % 4) : 0
  const ringShakeY = isRing
    ? interpolate(ringCycle, [0, 1, 2, 3], [-2.5, 2.5, -2, 2])
    : 0
  const ringShakeX = isRing
    ? interpolate(ringCycle, [0, 1, 2, 3], [1.5, -1.5, 1, -1])
    : 0
  const bodyShake = isRing
    ? interpolate(ringCycle, [0, 1, 2, 3], [-0.5, 0.5, -0.3, 0.3])
    : 0

  // --- DIAL animation: button flash sequence ---
  const isDial = animation === "dial"
  const dialFrame = isDial ? frame % (fps * 2) : 0
  const dialActiveButton = isDial
    ? Math.floor(interpolate(dialFrame, [0, fps * 1.5], [0, 9], { extrapolateRight: "clamp" }))
    : -1

  // --- Combined handset transform ---
  const handsetY = handsetLiftY + ringShakeY
  const handsetX = ringShakeX

  // --- Root transform ---
  const rootTransform = [
    `translateX(${entryX}px)`,
    `scale(${idleScale})`,
    `translateX(${bodyShake}px)`,
  ].join(" ")

  // --- Wheel rotation (entry or ring) ---
  const wheelRotation = entryWheelRotation + (isRing
    ? interpolate(ringCycle, [0, 1, 2, 3], [-3, 3, -2, 2])
    : 0)

  // Outline colors adapt to background
  const outline = darkBg ? "#FFFFFF" : "#1A1A1A"
  const outlineOpacity = darkBg ? 0.35 : 0.25
  const cableOutlineOpacity = darkBg ? 0.4 : 0.3

  const w = 200 * scale
  const h = 200 * scale

  const buttons = [
    { x: 66, y: 56 }, { x: 90, y: 56 }, { x: 114, y: 56 },
    { x: 66, y: 74 }, { x: 90, y: 74 }, { x: 114, y: 74 },
    { x: 66, y: 92 }, { x: 90, y: 92 }, { x: 114, y: 92 },
  ]

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 -20 200 200"
      style={{
        opacity: entryOpacity,
        transform: rootTransform,
      }}
    >
      {/* Rear wheels */}
      <rect x="16" y="112" width="22" height="30" rx="4" fill="#1A1A1A"
        stroke={darkBg ? "#FFFFFF" : "none"} strokeWidth={darkBg ? 1 : 0} strokeOpacity={darkBg ? 0.2 : 0} />
      <rect x="162" y="112" width="22" height="30" rx="4" fill="#1A1A1A"
        stroke={darkBg ? "#FFFFFF" : "none"} strokeWidth={darkBg ? 1 : 0} strokeOpacity={darkBg ? 0.2 : 0} />
      <rect x="20" y="121" width="14" height="12" rx="2" fill="#666" />
      <rect x="166" y="121" width="14" height="12" rx="2" fill="#666" />

      {/* Body shadow */}
      <rect x="36" y="44" width="130" height="84" rx="6" fill="#AF2C2C" />

      {/* Body with outline for contrast on red backgrounds */}
      <rect
        x="34"
        y="40"
        width="130"
        height="84"
        rx="6"
        fill="#CC3333"
        stroke={outline}
        strokeWidth="1.5"
        strokeOpacity={outlineOpacity}
      />

      {/* Body highlight */}
      <rect x="38" y="44" width="50" height="4" rx="2" fill="#FF5555" opacity="0.5" />

      {/* Buttons 3x3 grid */}
      {buttons.map((btn, i) => (
        <rect
          key={i}
          x={btn.x}
          y={btn.y}
          width="16"
          height="12"
          rx="2"
          fill={dialActiveButton === i ? "#CC3333" : "#F5F0E8"}
        />
      ))}

      {/* Handset group (lifts on entry, vibrates on ring) */}
      <g transform={`translate(${handsetX}, ${handsetY})`}>
        {/* Earpieces */}
        <rect x="38" y="14" width="36" height="26" rx="13" fill="#1A1A1A"
          stroke={darkBg ? "#FFFFFF" : "none"} strokeWidth={darkBg ? 1 : 0} strokeOpacity={darkBg ? 0.3 : 0} />
        <rect x="124" y="14" width="36" height="26" rx="13" fill="#1A1A1A"
          stroke={darkBg ? "#FFFFFF" : "none"} strokeWidth={darkBg ? 1 : 0} strokeOpacity={darkBg ? 0.3 : 0} />
        {/* Bar */}
        <rect x="66" y="14" width="66" height="14" rx="4" fill="#1A1A1A"
          stroke={darkBg ? "#FFFFFF" : "none"} strokeWidth={darkBg ? 1 : 0} strokeOpacity={darkBg ? 0.3 : 0} />
      </g>

      {/* Cable coil (stretches when handset lifts) */}
      {/* Cable outline for contrast on red backgrounds */}
      <path
        d={`M158 ${28 + handsetY} C166 ${22 + handsetY * 0.5}, 170 34, 178 28 C182 24, 180 34, 184 32`}
        stroke={outline}
        strokeWidth="5"
        strokeOpacity={cableOutlineOpacity}
        fill="none"
        strokeLinecap="round"
      />
      {/* Cable fill */}
      <path
        d={`M158 ${28 + handsetY} C166 ${22 + handsetY * 0.5}, 170 34, 178 28 C182 24, 180 34, 184 32`}
        stroke="#CC3333"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Front wheels */}
      <g transform={`rotate(${wheelRotation}, 24, 136)`}>
        <rect x="10" y="118" width="28" height="36" rx="6" fill="#1A1A1A"
          stroke={darkBg ? "#FFFFFF" : "none"} strokeWidth={darkBg ? 1 : 0} strokeOpacity={darkBg ? 0.2 : 0} />
        <rect x="16" y="128" width="16" height="16" rx="3" fill="#666" />
      </g>
      <g transform={`rotate(${wheelRotation}, 176, 136)`}>
        <rect x="162" y="118" width="28" height="36" rx="6" fill="#1A1A1A"
          stroke={darkBg ? "#FFFFFF" : "none"} strokeWidth={darkBg ? 1 : 0} strokeOpacity={darkBg ? 0.2 : 0} />
        <rect x="168" y="128" width="16" height="16" rx="3" fill="#666" />
      </g>

      {/* Base with outline */}
      <rect
        x="38"
        y="122"
        width="124"
        height="8"
        rx="2"
        fill="#AF2C2C"
        stroke={outline}
        strokeWidth="1"
        strokeOpacity={outlineOpacity}
      />
    </svg>
  )
}
