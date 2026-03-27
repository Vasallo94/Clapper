import React from "react"
import { AbsoluteFill, Audio, Series, staticFile } from "remotion"
import { TutorialConfig } from "./schema"
import { ThemeContext } from "./ThemeContext"
import { getTheme } from "./themes"
import { IntroScene } from "./scenes/IntroScene"
import { TerminalScene } from "./scenes/TerminalScene"
import { CalloutScene } from "./scenes/CalloutScene"
import { OutroScene } from "./scenes/OutroScene"
import { CustomScene } from "./scenes/CustomScene"

export const ClaudeCodeTutorial: React.FC<TutorialConfig> = (config) => {
  const bg = getTheme(config.theme ?? "default").background
  return (
    <ThemeContext.Provider value={config.theme ?? "default"}>
      <AbsoluteFill style={{ background: bg }}>
        <Series>
          {config.scenes.map((scene, i) => {
            const durationInFrames = Math.ceil(scene.durationInSeconds * config.fps)
            return (
              <Series.Sequence key={i} durationInFrames={durationInFrames}>
                {config.voiceover?.enabled && config.voiceover.scenes[String(i)] && (
                  <Audio src={staticFile(`voiceover/${config.id}/${i}.mp3`)} />
                )}
                {scene.type === "intro" && <IntroScene {...scene} />}
                {scene.type === "terminal" && <TerminalScene {...scene} />}
                {scene.type === "callout" && <CalloutScene {...scene} />}
                {scene.type === "outro" && <OutroScene {...scene} />}
                {scene.type === "custom" && <CustomScene {...scene} />}
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}
