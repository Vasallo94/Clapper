import React from "react"
import { AbsoluteFill, Audio, Sequence, Series, staticFile, useVideoConfig } from "remotion"
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
import { computeMusicVolume, dbToLinear, getSceneSfxEntries, sfxEndFrame, sfxTriggerFrame } from "../../utils/audioMix"
import type { SceneAudioInfo } from "../../utils/audioMix"

export const ClaudeCodeTutorial: React.FC<TutorialConfig> = (config) => {
  const bg = getTheme(config.theme ?? "default").background
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

    const sceneType =
      scene.type === "custom" ? `custom/${(scene as { componentId?: string }).componentId ?? "unknown"}` : scene.type
    sceneAudioInfos.push({
      startFrame: cumulativeFrames,
      durationFrames: durationInFrames,
      timing: timing ?? undefined,
      audioDurationMs: hasVoiceover ? directedScene.durationInSeconds * 1000 : null,
      sceneType,
    })

    cumulativeFrames += durationInFrames
  }

  return (
    <ThemeContext.Provider value={config.theme ?? "default"}>
      <AbsoluteFill style={{ background: bg }}>
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
