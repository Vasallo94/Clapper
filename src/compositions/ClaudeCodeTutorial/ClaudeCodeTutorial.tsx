import React from "react"
import { AbsoluteFill, Audio, Sequence, Series, staticFile } from "remotion"
import { TutorialConfig } from "./schema"
import { ThemeContext } from "./ThemeContext"
import { getTheme } from "./themes"
import { IntroScene } from "./scenes/IntroScene"
import { TerminalScene } from "./scenes/TerminalScene"
import { CalloutScene } from "./scenes/CalloutScene"
import { OutroScene } from "./scenes/OutroScene"
import { CustomScene } from "./scenes/CustomScene"
import {
  getMergedBeats,
  getMergedTiming,
  getSceneAudioDelayMs,
  getVoiceoverText,
  msToFrames,
} from "../../utils/direction"

export const ClaudeCodeTutorial: React.FC<TutorialConfig> = (config) => {
  const bg = getTheme(config.theme ?? "default").background
  return (
    <ThemeContext.Provider value={config.theme ?? "default"}>
      <AbsoluteFill style={{ background: bg }}>
        <Series>
          {config.scenes.map((scene, i) => {
            const voiceScene = config.voiceover?.scenes[String(i)]
            const timing = getMergedTiming(scene.timing, voiceScene)
            const beats = getMergedBeats(scene.beats, voiceScene)
            const directedScene = {
              ...scene,
              ...(timing ? { timing } : {}),
              ...(beats ? { beats } : {}),
            }
            const durationInFrames = Math.ceil(directedScene.durationInSeconds * config.fps)
            const audioDelayFrames = msToFrames(getSceneAudioDelayMs(timing), config.fps)
            const hasVoiceover = config.voiceover?.enabled && Boolean(getVoiceoverText(voiceScene))
            return (
              <Series.Sequence key={i} durationInFrames={durationInFrames}>
                {hasVoiceover && (
                  <Sequence from={audioDelayFrames}>
                    <Audio src={staticFile(`voiceover/${config.id}/${i}.mp3`)} />
                  </Sequence>
                )}
                {directedScene.type === "intro" && <IntroScene {...directedScene} />}
                {directedScene.type === "terminal" && <TerminalScene {...directedScene} />}
                {directedScene.type === "callout" && <CalloutScene {...directedScene} />}
                {directedScene.type === "outro" && <OutroScene {...directedScene} />}
                {directedScene.type === "custom" && <CustomScene {...directedScene} />}
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}
