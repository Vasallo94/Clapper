import { z } from "zod"

export const BeatSchema = z.object({
  id: z.string(),
  startMs: z.number().min(0),
  endMs: z.number().min(0).optional(),
  narration: z.string(),
  visual: z.string(),
  animation: z.string(),
  emphasis: z.enum(["low", "medium", "high"]).optional(),
})

export const TimingSchema = z.object({
  leadInMs: z.number().min(0).optional(),
  audioStartMs: z.number().min(0).optional(),
  tailHoldMs: z.number().min(0).optional(),
  minVisualHoldMs: z.number().min(0).optional(),
  transitionMs: z.number().min(0).max(1500).optional(),
})

export const BriefSchema = z.object({
  platform: z.string(),
  audience: z.string(),
  goal: z.string(),
  promise: z.string(),
  tone: z.string(),
  cta: z.string(),
  hookStrategy: z.string(),
})

export const DirectionSceneFieldsSchema = z.object({
  timing: TimingSchema.optional(),
  beats: z.array(BeatSchema).optional(),
})

export const ElevenLabsVoiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  useSpeakerBoost: z.boolean().optional(),
  speed: z.number().positive().optional(),
})

export const ElevenLabsPronunciationDictionarySchema = z.object({
  id: z.string(),
  versionId: z.string(),
})

export const ElevenLabsOptionsSchema = z.object({
  modelId: z.string().optional(),
  outputFormat: z.string().optional(),
  languageCode: z.string().optional(),
  seed: z.number().int().nonnegative().optional(),
  enableLogging: z.boolean().optional(),
  applyTextNormalization: z.enum(["auto", "on", "off"]).optional(),
  voiceSettings: ElevenLabsVoiceSettingsSchema.optional(),
  pronunciationDictionaries: z.array(ElevenLabsPronunciationDictionarySchema).max(3).optional(),
  previousText: z.string().optional(),
  nextText: z.string().optional(),
})

export const VoiceoverSceneObjectSchema = z.object({
  text: z.string(),
  leadInMs: z.number().min(0).optional(),
  audioStartMs: z.number().min(0).optional(),
  tailHoldMs: z.number().min(0).optional(),
  minVisualHoldMs: z.number().min(0).optional(),
  beats: z.array(BeatSchema).optional(),
  elevenlabs: ElevenLabsOptionsSchema.optional(),
})

export const VoiceoverSceneSchema = z.union([z.string(), VoiceoverSceneObjectSchema])

export const VoiceoverConfigSchema = z.object({
  enabled: z.literal(true),
  provider: z.enum(["gemini", "elevenlabs"]).default("gemini"),
  voiceId: z.string(),
  language: z.string().optional(),
  elevenlabs: ElevenLabsOptionsSchema.optional(),
  scenes: z.record(z.string(), VoiceoverSceneSchema),
})

// --- Sound Design schemas ---

export const SoundLibraryEntrySchema = z.object({
  id: z.string(),
  prompt: z.string(),
  file: z.string(),
  durationMs: z.number(),
  tags: z.array(z.string()),
})

export const SfxEntrySchema = z.object({
  id: z.string(),
  prompt: z.string(),
  durationMs: z.number().min(500).max(30000).optional(),
  loop: z.boolean().default(false),
  volume: z.number().default(-12),
  trigger: z.enum(["scene-start", "beat", "typewriter", "reveal", "transition", "accent-line"]),
  sceneTypes: z.array(z.string()).optional(),
  beatEmphasis: z.enum(["low", "medium", "high"]).optional(),
})

export const MusicBedSchema = z.object({
  libraryId: z.string().optional(),
  customPrompt: z.string().optional(),
  volume: z.number().default(-18),
  duckingVolume: z.number().default(-26),
  fadeInMs: z.number().default(2000),
  fadeOutMs: z.number().default(3000),
  duckingFadeMs: z.number().default(400),
})

export const SoundDesignSchema = z.object({
  enabled: z.boolean().default(false),
  musicBed: MusicBedSchema.optional(),
  sfx: z.array(SfxEntrySchema).default([]),
  sceneOverrides: z
    .record(
      z.string(),
      z.object({
        disableSfx: z.array(z.string()).optional(),
        extraSfx: z.array(SfxEntrySchema).optional(),
      }),
    )
    .optional(),
})

// --- Type exports ---

export type Beat = z.infer<typeof BeatSchema>
export type Timing = z.infer<typeof TimingSchema>
export type Brief = z.infer<typeof BriefSchema>
export type VoiceoverScene = z.infer<typeof VoiceoverSceneSchema>
export type VoiceoverConfig = z.infer<typeof VoiceoverConfigSchema>
export type ElevenLabsOptions = z.infer<typeof ElevenLabsOptionsSchema>
export type SfxEntry = z.infer<typeof SfxEntrySchema>
export type MusicBed = z.infer<typeof MusicBedSchema>
export type SoundDesign = z.infer<typeof SoundDesignSchema>
export type SoundLibraryEntry = z.infer<typeof SoundLibraryEntrySchema>

type DirectionalScene = {
  durationInSeconds: number
  timing?: Timing
  beats?: Beat[]
}

const hasValue = (value: number | undefined) => typeof value === "number" && Number.isFinite(value)

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

export const getMergedTiming = (sceneTiming?: Timing, voiceScene?: VoiceoverScene): Timing | undefined => {
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

export const getMergedBeats = (sceneBeats?: Beat[], voiceScene?: VoiceoverScene) => {
  if (sceneBeats && sceneBeats.length > 0) {
    return sceneBeats
  }

  if (voiceScene && typeof voiceScene !== "string" && voiceScene.beats?.length) {
    return voiceScene.beats
  }

  return undefined
}

export const hasExplicitDirection = (timing?: Timing, beats?: Beat[]) =>
  Boolean((timing && Object.values(timing).some(hasValue)) || (beats && beats.length > 0))

export const getSceneMotionDelayMs = (timing?: Timing) => timing?.leadInMs ?? 0

export const getSceneAudioDelayMs = (timing?: Timing) => (timing?.leadInMs ?? 0) + (timing?.audioStartMs ?? 0)

export const getSceneTailHoldMs = (timing?: Timing) =>
  hasValue(timing?.tailHoldMs) ? (timing?.tailHoldMs ?? 0) : DEFAULT_AUDIO_TAIL_PADDING_MS

export const getSceneMinVisualHoldMs = (timing?: Timing) => timing?.minVisualHoldMs ?? 0

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
  timing?: Timing
}) => {
  const totalMs =
    getSceneAudioDelayMs(timing) +
    audioDurationInSeconds * 1000 +
    getSceneTailHoldMs(hasExplicitDirection(timing) ? timing : undefined)

  return totalMs / 1000
}
