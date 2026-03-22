import React from "react"
import { AbsoluteFill, Series } from "remotion"
import { TutorialConfig } from "./schema"
import { IntroScene } from "./scenes/IntroScene"
import { TerminalScene } from "./scenes/TerminalScene"
import { CalloutScene } from "./scenes/CalloutScene"
import { OutroScene } from "./scenes/OutroScene"
import { CustomScene } from "./scenes/CustomScene"

export const ClaudeCodeTutorial: React.FC<TutorialConfig> = (config) => {
  return (
    <AbsoluteFill style={{ background: "#0d1117" }}>
      <Series>
        {config.scenes.map((scene, i) => {
          const durationInFrames = Math.ceil(scene.durationInSeconds * config.fps)
          return (
            <Series.Sequence key={i} durationInFrames={durationInFrames}>
              {scene.type === "intro" && <IntroScene {...scene} />}
              {scene.type === "terminal" && <TerminalScene {...scene} fps={config.fps} />}
              {scene.type === "callout" && <CalloutScene {...scene} />}
              {scene.type === "outro" && <OutroScene {...scene} />}
              {scene.type === "custom" && <CustomScene {...scene} />}
            </Series.Sequence>
          )
        })}
      </Series>
    </AbsoluteFill>
  )
}
