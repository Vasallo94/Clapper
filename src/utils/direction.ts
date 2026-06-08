// Re-export all schemas and types from shared/schemas
export {
  BeatSchema,
  TimingSchema,
  BriefSchema,
  DirectionSceneFieldsSchema,
  ElevenLabsOptionsSchema,
  VoiceoverSceneSchema,
  VoiceoverConfigSchema,
  MusicBedSchema,
  SfxEntrySchema,
  SoundDesignSchema,
  type Beat,
  type Timing,
  type Brief,
  type VoiceoverScene,
  type VoiceoverConfig,
  type ElevenLabsOptions,
  type SfxEntry,
  type MusicBed,
  type SoundDesign,
  type SoundLibraryEntry,
} from "../shared/schemas"

// Import types for local use in helper functions
import type { Beat, Timing, VoiceoverScene } from "../shared/schemas"

type DirectionalScene = {
  durationInSeconds: number
  timing?: Timing | null
  beats?: Beat[] | null
}

const hasValue = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value)

export const DEFAULT_AUDIO_TAIL_PADDING_MS = 350

export const msToFrames = (ms: number, fps: number) => Math.round((ms / 1000) * fps)

export const framesToMs = (frames: number, fps: number) => Math.round((frames / fps) * 1000)

export const getVoiceoverText = (scene?: VoiceoverScene) => {
  if (!scene) return null
  return typeof scene === "string" ? scene : scene.text
}

export const getVoiceoverSceneObject = (scene?: VoiceoverScene) => {
  if (!scene || typeof scene === "string") return undefined
  return scene
}

export const getMergedTiming = (sceneTiming?: Timing | null, voiceScene?: VoiceoverScene): Timing | undefined => {
  const voiceTiming =
    voiceScene && typeof voiceScene !== "string"
      ? {
          leadInMs: voiceScene.leadInMs,
          audioStartMs: voiceScene.audioStartMs,
          tailHoldMs: voiceScene.tailHoldMs,
          minVisualHoldMs: voiceScene.minVisualHoldMs,
        }
      : undefined

  const merged = {
    ...voiceTiming,
    ...sceneTiming,
  }

  return Object.values(merged).some(hasValue) ? merged : undefined
}

export const getMergedBeats = (sceneBeats?: Beat[] | null, voiceScene?: VoiceoverScene) => {
  if (sceneBeats && sceneBeats.length > 0) {
    return sceneBeats
  }

  if (voiceScene && typeof voiceScene !== "string" && voiceScene.beats?.length) {
    return voiceScene.beats
  }

  return undefined
}

export const hasExplicitDirection = (timing?: Timing | null, beats?: Beat[] | null) =>
  Boolean((timing && Object.values(timing).some(hasValue)) || (beats && beats.length > 0))

export const getSceneMotionDelayMs = (timing?: Timing | null) => timing?.leadInMs ?? 0

export const getSceneAudioDelayMs = (timing?: Timing | null) => (timing?.leadInMs ?? 0) + (timing?.audioStartMs ?? 0)

export const getSceneTailHoldMs = (timing?: Timing | null) =>
  hasValue(timing?.tailHoldMs) ? (timing?.tailHoldMs ?? 0) : DEFAULT_AUDIO_TAIL_PADDING_MS

export const getSceneMinVisualHoldMs = (timing?: Timing | null) => timing?.minVisualHoldMs ?? 0

export const getBeatStartFrame = (beat: Beat, fps: number) => msToFrames(beat.startMs, fps)

export const getBeatEndFrame = (beat: Beat, fps: number, fallbackDurationMs = 600) =>
  msToFrames(beat.endMs ?? beat.startMs + fallbackDurationMs, fps)

export const getBeatProgress = (frame: number, beat: Beat, fps: number, fallbackDurationMs = 600) => {
  const start = getBeatStartFrame(beat, fps)
  const end = getBeatEndFrame(beat, fps, fallbackDurationMs)
  if (frame <= start) return 0
  if (frame >= end) return 1
  return (frame - start) / Math.max(1, end - start)
}

export const getBeatById = (beats: Beat[] | undefined, beatId: string) => beats?.find((beat) => beat.id === beatId)

export { getVisualReadyMs, DEFAULT_VISUAL_READY_MS } from "../shared/sceneTimingRegistry"

export const mergeSceneDirection = <T extends DirectionalScene>(scene: T, voiceScene?: VoiceoverScene) => {
  const timing = getMergedTiming(scene.timing, voiceScene)
  const beats = getMergedBeats(scene.beats, voiceScene)

  return {
    ...scene,
    ...(timing ? { timing } : {}),
    ...(beats ? { beats } : {}),
  }
}

export const getDirectedSceneDurationInSeconds = ({
  audioDurationInSeconds,
  timing,
}: {
  audioDurationInSeconds: number
  timing?: Timing | null
}) => {
  const totalMs =
    getSceneAudioDelayMs(timing) +
    audioDurationInSeconds * 1000 +
    getSceneTailHoldMs(hasExplicitDirection(timing) ? timing : undefined)

  return totalMs / 1000
}
