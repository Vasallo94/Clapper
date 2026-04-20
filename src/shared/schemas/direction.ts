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

// Type exports
export type Beat = z.infer<typeof BeatSchema>
export type Timing = z.infer<typeof TimingSchema>
export type Brief = z.infer<typeof BriefSchema>
