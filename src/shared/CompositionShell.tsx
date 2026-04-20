import React from "react"
import { AbsoluteFill, Audio, Sequence, Series, staticFile, useVideoConfig } from "remotion"
import { ThemeContext, getTheme } from "./themes"
import type { ThemeName } from "./themes"
import { computeMusicVolume, dbToLinear, getSceneSfxEntries, sfxEndFrame, sfxTriggerFrame } from "../utils/audioMix"
import type { Beat, MusicBed, SoundDesign, Timing, VoiceoverConfig } from "./schemas"
import { precomputeScenes, type SceneInfo } from "./useScenePrecomputation"
import type { SceneAudioInfo } from "../utils/audioMix"

interface CompositionShellScene {
  type: string
  durationInSeconds: number
  timing?: Timing
  beats?: Beat[]
  componentId?: string
}

interface CompositionShellConfig<S extends CompositionShellScene> {
  id: string
  fps: number
  soundDesign?: SoundDesign
  voiceover?: VoiceoverConfig
  scenes: S[]
}

interface CompositionShellProps<S extends CompositionShellScene> {
  config: CompositionShellConfig<S>
  theme: ThemeName
  renderScene: (scene: S, index: number) => React.ReactNode
  renderOverlay?: (scene: S, info: SceneInfo<S>, index: number) => React.ReactNode
  musicLoop?: boolean
}

export function CompositionShell<S extends CompositionShellScene>({
  config,
  theme,
  renderScene,
  renderOverlay,
  musicLoop,
}: CompositionShellProps<S>) {
  const { durationInFrames: totalDurationInFrames } = useVideoConfig()
  const bg = getTheme(theme).background

  const { sceneInfos, sceneAudioInfos } = precomputeScenes(config.scenes, config)

  return (
    <ThemeContext.Provider value={theme}>
      <AbsoluteFill style={{ background: bg }}>
        {config.soundDesign?.enabled && config.soundDesign.musicBed && (
          <Audio
            src={staticFile(`audio/${config.id}/music-bed.mp3`)}
            volume={(f) =>
              computeMusicVolume(
                f,
                sceneAudioInfos,
                config.soundDesign!.musicBed as MusicBed,
                config.fps,
                totalDurationInFrames,
              )
            }
            {...(musicLoop ? { loop: true } : {})}
          />
        )}
        <Series>
          {sceneInfos.map((info, i) => {
            const { directedScene, durationInFrames, timing, hasVoiceover, audioDelayFrames } = info
            return (
              <Series.Sequence key={i} durationInFrames={durationInFrames}>
                {hasVoiceover && (
                  <Sequence from={audioDelayFrames}>
                    <Audio src={staticFile(`voiceover/${config.id}/${i}.mp3`)} />
                  </Sequence>
                )}
                {config.soundDesign?.enabled &&
                  getSceneSfxEntries(i, sceneAudioInfos[i].sceneType, config.soundDesign as SoundDesign).map((sfx) => {
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
                {renderScene(directedScene, i)}
                {renderOverlay?.(directedScene, info, i)}
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}

export type { SceneInfo, SceneAudioInfo }
