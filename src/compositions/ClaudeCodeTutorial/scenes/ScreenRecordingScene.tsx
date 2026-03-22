// src/compositions/ClaudeCodeTutorial/scenes/ScreenRecordingScene.tsx
import React from "react"
import {
  AbsoluteFill,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion"
import { z } from "zod"
import { TutorialConfigSchema } from "../schema"

type ScreenRecordingSceneProps = Extract<
  z.infer<typeof TutorialConfigSchema>["scenes"][number],
  { type: "screenRecording" }
> & { fps: number }

const FRAME_DEFAULTS = {
  background: "#FFFFFF",
  borderRadius: 12,
  padding: 40,
  shadow: true,
}

export const ScreenRecordingScene: React.FC<ScreenRecordingSceneProps> = ({
  src,
  trim,
  frame: frameConfig,
  resolvedSrc,
}) => {
  const currentFrame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const f = { ...FRAME_DEFAULTS, ...frameConfig }

  const enterSpring = spring({
    frame: currentFrame,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  })
  const opacity = interpolate(enterSpring, [0, 1], [0, 1])
  const translateY = interpolate(enterSpring, [0, 1], [20, 0])

  const videoSrc = resolvedSrc ? staticFile(resolvedSrc) : src
  const startFromFrame = trim ? Math.round(trim.startSec * fps) : 0
  const endAtFrame = trim ? Math.round(trim.endSec * fps) : undefined

  return (
    <AbsoluteFill
      style={{
        background: f.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: f.padding,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: f.borderRadius,
          overflow: "hidden",
          opacity,
          transform: `translateY(${translateY}px)`,
          boxShadow: f.shadow ? "0 20px 60px rgba(0,0,0,0.15)" : "none",
        }}
      >
        <Video
          src={videoSrc}
          startFrom={startFromFrame}
          endAt={endAtFrame}
          volume={0}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
