import { z } from "zod"

export const BeatSchema = z.object({
  id: z.string(),
  startMs: z.number().min(0),
  endMs: z.number().min(0).nullable().optional(),
  narration: z.string().nullable().optional(),
  visual: z.string().nullable().optional(),
  animation: z.string().nullable().optional(),
  emphasis: z.enum(["low", "medium", "high"]).nullable().optional(),
})

export const TimingSchema = z.object({
  leadInMs: z.number().min(0).nullable().optional(),
  audioStartMs: z.number().min(0).nullable().optional(),
  tailHoldMs: z.number().min(0).nullable().optional(),
  minVisualHoldMs: z.number().min(0).nullable().optional(),
  transitionMs: z.number().min(0).max(1500).nullable().optional(),
})

export const BriefSchema = z.object({
  platform: z.string(),
  audience: z.string(),
  goal: z.string(),
  promise: z.string(),
  tone: z.string(),
  cta: z.string(),
  hookStrategy: z.string(),
  templateId: z.string().nullable().optional(),
  narrativeArc: z.array(z.string()).nullable().optional(),
})

export const DirectionSceneFieldsSchema = z.object({
  timing: TimingSchema.nullable().optional(),
  beats: z.array(BeatSchema).nullable().optional(),
})

// Type exports
export type Beat = z.infer<typeof BeatSchema>
export type Timing = z.infer<typeof TimingSchema>
export type Brief = z.infer<typeof BriefSchema>
