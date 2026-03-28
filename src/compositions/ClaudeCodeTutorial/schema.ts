// src/compositions/ClaudeCodeTutorial/schema.ts
import { z } from "zod"
import { BriefSchema, DirectionSceneFieldsSchema, VoiceoverConfigSchema } from "../../utils/direction"

const PixelLogoSchema = z.object({
  enabled: z.boolean().default(true),
  scale: z.number().min(1).max(12).optional(),
  animation: z.enum(["none", "build", "glint", "pulse"]).optional(),
})

const IntroSceneSchema = z
  .object({
    type: z.literal("intro"),
    title: z.string(),
    subtitle: z.string().optional(),
    pixelLogo: PixelLogoSchema.optional(),
    durationInSeconds: z.number().min(1).max(30),
  })
  .merge(DirectionSceneFieldsSchema)

const TerminalLineSchema = z.object({
  kind: z.enum(["command", "output", "claude", "blank"]),
  text: z.string(),
  delayAfterMs: z.number().int().min(0).optional(),
})

const TerminalSceneSchema = z
  .object({
    type: z.literal("terminal"),
    title: z.string().optional(),
    lines: z.array(TerminalLineSchema).min(1),
    durationInSeconds: z.number().min(2).max(120),
  })
  .merge(DirectionSceneFieldsSchema)

const CalloutSceneSchema = z
  .object({
    type: z.literal("callout"),
    text: z.string(),
    position: z.enum(["top", "bottom", "right"]),
    background: z.enum(["overlay", "solid"]).default("overlay"),
    durationInSeconds: z.number().min(1).max(15),
  })
  .merge(DirectionSceneFieldsSchema)

const OutroSceneSchema = z
  .object({
    type: z.literal("outro"),
    title: z.string(),
    bullets: z.array(z.string()).optional(),
    durationInSeconds: z.number().min(2).max(20),
  })
  .merge(DirectionSceneFieldsSchema)

const CustomSceneSchema = z
  .object({
    type: z.literal("custom"),
    componentId: z.string(),
    durationInSeconds: z.number().min(1).max(120),
    props: z.record(z.string(), z.any()).optional(),
  })
  .merge(DirectionSceneFieldsSchema)

const SceneSchema = z.union([
  IntroSceneSchema,
  TerminalSceneSchema,
  CalloutSceneSchema,
  OutroSceneSchema,
  CustomSceneSchema,
])

export const TutorialConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  fps: z.literal(30),
  width: z.literal(1280),
  height: z.literal(720),
  theme: z.enum(["default", "linea-directa", "atom-dark"]).default("default"),
  brief: BriefSchema.optional(),
  scenes: z.array(SceneSchema).min(1),
  voiceover: VoiceoverConfigSchema.optional(),
})

export type TutorialConfig = z.infer<typeof TutorialConfigSchema>
export type TerminalLine = z.infer<typeof TerminalLineSchema>
export type ThemeName = TutorialConfig["theme"]

// Scene prop types — use these instead of Extract<...> in scene components
export type IntroSceneProps = z.infer<typeof IntroSceneSchema>
export type TerminalSceneProps = z.infer<typeof TerminalSceneSchema>
export type CalloutSceneProps = z.infer<typeof CalloutSceneSchema>
export type OutroSceneProps = z.infer<typeof OutroSceneSchema>
export type CustomSceneProps = z.infer<typeof CustomSceneSchema>
