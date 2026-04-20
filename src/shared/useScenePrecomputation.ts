import type { SceneAudioInfo } from "../utils/audioMix"
import { getMergedBeats, getMergedTiming, getSceneAudioDelayMs, getVoiceoverText, msToFrames } from "../utils/direction"
import type { Beat, Timing, VoiceoverConfig } from "./schemas"

export interface SceneInfo<S> {
  directedScene: S
  durationInFrames: number
  timing: Timing | undefined
  hasVoiceover: boolean
  audioDelayFrames: number
}

interface PrecomputableScene {
  type: string
  durationInSeconds: number
  timing?: Timing
  beats?: Beat[]
  componentId?: string
}

interface PrecomputableConfig {
  fps: number
  voiceover?: VoiceoverConfig
}

export interface PrecomputeResult<S> {
  sceneInfos: SceneInfo<S>[]
  sceneAudioInfos: SceneAudioInfo[]
}

export function precomputeScenes<S extends PrecomputableScene>(
  scenes: S[],
  config: PrecomputableConfig,
): PrecomputeResult<S> {
  const sceneInfos: SceneInfo<S>[] = []
  const sceneAudioInfos: SceneAudioInfo[] = []
  let cumulativeFrames = 0

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const voiceScene = config.voiceover?.scenes[String(i)]
    const timing = getMergedTiming(scene.timing, voiceScene)
    const beats = getMergedBeats(scene.beats, voiceScene)
    const directedScene = {
      ...scene,
      ...(timing ? { timing } : {}),
      ...(beats ? { beats } : {}),
    } as S
    const durationInFrames = Math.ceil(directedScene.durationInSeconds * config.fps)
    const audioDelayFrames = msToFrames(getSceneAudioDelayMs(timing), config.fps)
    const hasVoiceover = Boolean(config.voiceover?.enabled && getVoiceoverText(voiceScene))

    sceneInfos.push({ directedScene, durationInFrames, timing, hasVoiceover, audioDelayFrames })

    const sceneType = scene.type === "custom" ? `custom/${scene.componentId ?? "unknown"}` : scene.type
    sceneAudioInfos.push({
      startFrame: cumulativeFrames,
      durationFrames: durationInFrames,
      timing: timing ?? undefined,
      audioDurationMs: hasVoiceover ? directedScene.durationInSeconds * 1000 : null,
      sceneType,
    })

    cumulativeFrames += durationInFrames
  }

  return { sceneInfos, sceneAudioInfos }
}
