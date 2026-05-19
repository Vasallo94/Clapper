// src/utils/calculateMetadata.ts
import { ALL_FORMATS, Input, UrlSource } from "mediabunny"
import { CalculateMetadataFunction, staticFile } from "remotion"
import {
  Beat,
  getDirectedSceneDurationInSeconds,
  getMergedBeats,
  getMergedTiming,
  Timing,
  getVoiceoverText,
  VoiceoverConfig,
} from "./direction"
import { getVisualReadyMs } from "../shared/sceneTimingRegistry"
import { calculateTotalFrames } from "../shared/calculateDuration"

type CompositionConfig = {
  id?: string
  fps: number
  width: number
  height: number
  scenes: { durationInSeconds: number; timing?: Timing | null; beats?: Beat[] | null }[]
  voiceover?: VoiceoverConfig | null
  transition?: { type?: string; durationInFrames?: number } | null
}

const roundSeconds = (value: number) => Math.ceil(value * 10) / 10
const audioDurationCache = new Map<string, number | null>()

async function getAudioDurationInSeconds(src: string) {
  if (audioDurationCache.has(src)) {
    return audioDurationCache.get(src) ?? null
  }
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src, {
        getRetryDelay: () => null,
      }),
    })
    const duration = await input.computeDuration()
    const parsed = Number.isFinite(duration) ? duration : null
    audioDurationCache.set(src, parsed)
    return parsed
  } catch {
    audioDurationCache.set(src, null)
    return null
  }
}

export function createCalculateMetadata<T extends CompositionConfig>(): CalculateMetadataFunction<T> {
  return async ({ props }) => {
    const syncedScenes = await Promise.all(
      props.scenes.map(async (scene, index) => {
        const voiceScene = props.voiceover?.scenes?.[String(index)]
        const timing = getMergedTiming(scene.timing, voiceScene)
        const beats = getMergedBeats(scene.beats, voiceScene)
        const mergedScene = {
          ...scene,
          ...(timing ? { timing } : {}),
          ...(beats ? { beats } : {}),
        }

        if (!props.voiceover?.enabled || !props.id || !getVoiceoverText(voiceScene)) {
          return mergedScene
        }

        const audioPath = staticFile(`voiceover/${props.id}/${index}.mp3`)
        const audioDuration = await getAudioDurationInSeconds(audioPath)

        if (!audioDuration) {
          return mergedScene
        }

        const visualReadyMs = getVisualReadyMs(
          ((scene as Record<string, unknown>).type as string) ?? "",
          (scene as Record<string, unknown>).componentId as string | undefined,
        )

        const effectiveTiming: Timing = {
          ...timing,
          audioStartMs: Math.max(visualReadyMs, timing?.audioStartMs ?? 0),
          leadInMs: 0,
        }

        if (timing?.audioStartMs != null && timing.audioStartMs < visualReadyMs) {
          console.warn(
            `[timing-sync] Scene ${index}: audioStartMs ${timing.audioStartMs}ms ` +
              `overridden to ${visualReadyMs}ms (visualReadyMs for ${(scene as Record<string, unknown>).type ?? "unknown"})`,
          )
        }
        if (timing?.leadInMs && timing.leadInMs > 0) {
          console.warn(
            `[timing-sync] Scene ${index}: leadInMs ${timing.leadInMs}ms ignored. Phase 1 starts at frame 0.`,
          )
        }

        return {
          ...mergedScene,
          durationInSeconds: Math.max(
            1,
            roundSeconds(
              getDirectedSceneDurationInSeconds({
                audioDurationInSeconds: audioDuration,
                timing: effectiveTiming,
              }),
            ),
          ),
        }
      }),
    )

    const syncedProps = {
      ...props,
      scenes: syncedScenes,
    }

    return {
      durationInFrames: calculateTotalFrames(syncedScenes, props.fps, props.transition),
      fps: props.fps,
      width: props.width,
      height: props.height,
      props: syncedProps,
    }
  }
}
