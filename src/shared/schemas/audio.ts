import { z } from "zod"
import { BeatSchema } from "./direction"

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

// Type exports
export type VoiceoverScene = z.infer<typeof VoiceoverSceneSchema>
export type VoiceoverConfig = z.infer<typeof VoiceoverConfigSchema>
export type ElevenLabsOptions = z.infer<typeof ElevenLabsOptionsSchema>
export type SfxEntry = z.infer<typeof SfxEntrySchema>
export type MusicBed = z.infer<typeof MusicBedSchema>
export type SoundDesign = z.infer<typeof SoundDesignSchema>
export type SoundLibraryEntry = z.infer<typeof SoundLibraryEntrySchema>
