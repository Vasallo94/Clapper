import React from "react"
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Sequence,
  Series,
  staticFile,
  useVideoConfig,
} from "remotion"
import { TutorialConfig } from "./schema"
import { ThemeContext } from "./ThemeContext"
import { getTheme } from "./themes"
import { IntroScene } from "./scenes/IntroScene"
import { TerminalScene } from "./scenes/TerminalScene"
import { CalloutScene } from "./scenes/CalloutScene"
import { OutroScene } from "./scenes/OutroScene"
import { CustomScene } from "./scenes/CustomScene"
import { KaraokeSubtitles, type WordTimestamp } from "./components/KaraokeSubtitles"
import { LogoWatermark } from "./components/LogoWatermark"
import {
  getMergedBeats,
  getMergedTiming,
  getSceneAudioDelayMs,
  getVoiceoverText,
  msToFrames,
} from "../../utils/direction"
import { computeMusicVolume, dbToLinear, getSceneSfxEntries, sfxEndFrame, sfxTriggerFrame } from "../../utils/audioMix"
import type { SceneAudioInfo } from "../../utils/audioMix"

function useTimestamps(configId: string, sceneCount: number, enabled: boolean): (WordTimestamp[] | null)[] {
  const [timestamps, setTimestamps] = React.useState<(WordTimestamp[] | null)[]>(() =>
    Array.from({ length: sceneCount }, () => null),
  )
  const [handle] = React.useState(() => (enabled ? delayRender("Loading subtitle timestamps") : null))

  React.useEffect(() => {
    if (!enabled) return

    const loadAll = async () => {
      const results: (WordTimestamp[] | null)[] = []
      for (let i = 0; i < sceneCount; i++) {
        try {
          const url = staticFile(`voiceover/${configId}/${i}.timestamps.json`)
          const res = await fetch(url)
          if (res.ok) {
            results.push(await res.json())
          } else {
            results.push(null)
          }
        } catch {
          results.push(null)
        }
      }
      setTimestamps(results)
      if (handle !== null) continueRender(handle)
    }

    loadAll()
  }, [configId, sceneCount, enabled, handle])

  return timestamps
}

export const ClaudeCodeTutorial: React.FC<TutorialConfig> = (config) => {
  const bg = getTheme(config.theme ?? "default").background
  const theme = getTheme(config.theme ?? "default")
  const { durationInFrames: totalDurationInFrames } = useVideoConfig()

  const subtitlesEnabled = config.subtitles?.enabled !== false && Boolean(config.voiceover?.enabled)
  const sceneTimestamps = useTimestamps(config.id, config.scenes.length, subtitlesEnabled)

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

  const showLogoWatermark = !theme.mascot.show

  return (
    <ThemeContext.Provider value={config.theme ?? "default"}>
      <AbsoluteFill style={{ background: bg }}>
        {config.soundDesign?.enabled && config.soundDesign.musicBed && (
          <Audio
            src={staticFile(`audio/${config.id}/music-bed.mp3`)}
            volume={(f) =>
              computeMusicVolume(f, sceneAudioInfos, config.soundDesign!.musicBed!, config.fps, totalDurationInFrames)
            }
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
                {subtitlesEnabled && sceneTimestamps[i] && (
                  <KaraokeSubtitles
                    timestamps={sceneTimestamps[i]!}
                    audioDelayFrames={audioDelayFrames}
                    position={config.subtitles?.position ?? "bottom"}
                    fontSize={config.subtitles?.fontSize ?? 32}
                  />
                )}
                {showLogoWatermark && directedScene.type !== "intro" && <LogoWatermark />}
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}
