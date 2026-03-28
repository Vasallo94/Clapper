import React from "react"
import { AbsoluteFill, Audio, Sequence, Series, staticFile, useVideoConfig } from "remotion"
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
import { computeMusicVolume, dbToLinear, getSceneSfxEntries, sfxEndFrame, sfxTriggerFrame } from "../../utils/audioMix"
import type { SceneAudioInfo } from "../../utils/audioMix"

export const ProductShort: React.FC<ProductShortConfig> = (config) => {
  const { durationInFrames: totalDurationInFrames } = useVideoConfig()

  // Pre-compute scene info for audio mixing
  const sceneInfos: {
    directedScene: (typeof config.scenes)[number]
    durationInFrames: number
    timing: ReturnType<typeof getMergedTiming>
    hasVoiceover: boolean
    audioDelayFrames: number
  }[] = []
  const sceneAudioInfos: SceneAudioInfo[] = []
  let cumulativeFrames = 0

  for (let i = 0; i < config.scenes.length; i++) {
    const scene = config.scenes[i]
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
    const hasVoiceover = Boolean(config.voiceover?.enabled && getVoiceoverText(voiceScene))

    sceneInfos.push({ directedScene, durationInFrames, timing, hasVoiceover, audioDelayFrames })

    sceneAudioInfos.push({
      startFrame: cumulativeFrames,
      durationFrames: durationInFrames,
      timing: timing ?? undefined,
      audioDurationMs: hasVoiceover ? directedScene.durationInSeconds * 1000 : null,
      sceneType: scene.type,
    })

    cumulativeFrames += durationInFrames
  }

  return (
    <ThemeContext.Provider value="linea-directa">
      <AbsoluteFill style={{ background: getTheme("linea-directa").background }}>
        {config.soundDesign?.enabled && config.soundDesign.musicBed && (
          <Audio
            src={staticFile(`audio/${config.id}/music-bed.mp3`)}
            volume={(f) =>
              computeMusicVolume(f, sceneAudioInfos, config.soundDesign!.musicBed!, config.fps, totalDurationInFrames)
            }
            loop
          />
        )}
        <Series>
          {sceneInfos.map(({ directedScene, durationInFrames, timing, hasVoiceover, audioDelayFrames }, i) => {
            return (
              <Series.Sequence key={i} durationInFrames={durationInFrames}>
                {hasVoiceover && (
                  <Sequence from={audioDelayFrames}>
                    <Audio src={staticFile(`voiceover/${config.id}/${i}.mp3`)} />
                  </Sequence>
                )}
                {config.soundDesign?.enabled &&
                  getSceneSfxEntries(i, sceneAudioInfos[i].sceneType, config.soundDesign).map((sfx) => {
                    const triggerFrame = sfxTriggerFrame(sfx, timing ?? undefined, config.fps)
                    const endFrame = sfxEndFrame(sfx, durationInFrames)
                    return (
                      <Sequence from={triggerFrame} key={sfx.id}>
                        <Audio
                          src={staticFile(`audio/${config.id}/sfx-${sfx.id}.mp3`)}
                          volume={() => dbToLinear(sfx.volume)}
                          {...(sfx.loop
                            ? { loop: true, ...(endFrame !== undefined ? { endAt: endFrame - triggerFrame } : {}) }
                            : {})}
                        />
                      </Sequence>
                    )
                  })}
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
