import { z } from "zod"

// Re-export all schemas and types from direction
export {
  BeatSchema,
  TimingSchema,
  BriefSchema,
  DirectionSceneFieldsSchema,
  type Beat,
  type Timing,
  type Brief,
} from "./direction"

// Re-export all schemas and types from audio
export {
  ElevenLabsVoiceSettingsSchema,
  ElevenLabsPronunciationDictionarySchema,
  ElevenLabsOptionsSchema,
  VoiceoverSceneObjectSchema,
  VoiceoverSceneSchema,
  SpeakerConfigSchema,
  VoiceoverConfigSchema,
  SoundLibraryEntrySchema,
  SfxEntrySchema,
  MusicBedSchema,
  SoundDesignSchema,
  type VoiceoverScene,
  type VoiceoverConfig,
  type SpeakerConfig,
  type ElevenLabsOptions,
  type SfxEntry,
  type MusicBed,
  type SoundDesign,
  type SoundLibraryEntry,
} from "./audio"

// Transition schemas
export const TransitionTypeSchema = z.enum(["fade", "slide", "wipe", "none"]).default("none")
export const TransitionConfigSchema = z
  .object({
    type: TransitionTypeSchema,
    durationInFrames: z.number().int().min(1).max(60).default(15),
  })
  .nullable()
  .optional()

export type TransitionType = z.infer<typeof TransitionTypeSchema>
export type TransitionConfig = z.infer<typeof TransitionConfigSchema>
