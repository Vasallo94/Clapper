import React from "react"
import { AbsoluteFill, Audio, Sequence, Series, staticFile } from "remotion"
import { ThemeContext } from "../ClaudeCodeTutorial/ThemeContext"
import { getTheme } from "../ClaudeCodeTutorial/themes"
import { ProductShortConfig } from "./schema"
import { BenefitsScene } from "./scenes/BenefitsScene"
import { CtaScene } from "./scenes/CtaScene"
import { HeroScene } from "./scenes/HeroScene"
import { PricingScene } from "./scenes/PricingScene"
import {
  getMergedBeats,
  getMergedTiming,
  getSceneAudioDelayMs,
  getVoiceoverText,
  msToFrames,
} from "../../utils/direction"

export const ProductShort: React.FC<ProductShortConfig> = (config) => {
  return (
    <ThemeContext.Provider value="linea-directa">
      <AbsoluteFill style={{ background: getTheme("linea-directa").background }}>
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
                {directedScene.type === "hero" && <HeroScene {...directedScene} />}
                {directedScene.type === "benefits" && <BenefitsScene {...directedScene} />}
                {directedScene.type === "pricing" && <PricingScene {...directedScene} />}
                {directedScene.type === "cta" && <CtaScene {...directedScene} />}
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}
