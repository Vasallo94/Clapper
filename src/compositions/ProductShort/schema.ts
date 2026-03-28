// src/compositions/ProductShort/schema.ts
import { z } from "zod"
import { BriefSchema, DirectionSceneFieldsSchema, VoiceoverConfigSchema } from "../../utils/direction"

const HeroSceneSchema = z
  .object({
    type: z.literal("hero"),
    title: z.string(),
    subtitle: z.string().optional(),
    durationInSeconds: z.number().min(1).max(10),
  })
  .merge(DirectionSceneFieldsSchema)

const BenefitItemSchema = z.object({
  icon: z.string(),
  text: z.string(),
})

const BenefitsSceneSchema = z
  .object({
    type: z.literal("benefits"),
    title: z.string().optional(),
    items: z.array(BenefitItemSchema).min(1),
    durationInSeconds: z.number().min(2).max(15),
  })
  .merge(DirectionSceneFieldsSchema)

const PricingSceneSchema = z
  .object({
    type: z.literal("pricing"),
    price: z.string(),
    period: z.string().optional(),
    note: z.string().optional(),
    variant: z.enum(["light", "dark"]),
    durationInSeconds: z.number().min(1).max(10),
  })
  .merge(DirectionSceneFieldsSchema)

const CtaSceneSchema = z
  .object({
    type: z.literal("cta"),
    text: z.string(),
    url: z.string().optional(),
    durationInSeconds: z.number().min(1).max(10),
  })
  .merge(DirectionSceneFieldsSchema)

const ProductShortSceneSchema = z.union([HeroSceneSchema, BenefitsSceneSchema, PricingSceneSchema, CtaSceneSchema])

export const ProductShortConfigSchema = z.object({
  id: z.string(),
  composition: z.literal("ProductShort"),
  product: z.string(),
  headline: z.string(),
  theme: z.literal("linea-directa"),
  fps: z.literal(30),
  width: z.literal(1080),
  height: z.literal(1920),
  brief: BriefSchema.optional(),
  scenes: z.array(ProductShortSceneSchema).min(1),
  voiceover: VoiceoverConfigSchema.optional(),
})

export type ProductShortConfig = z.infer<typeof ProductShortConfigSchema>
export type ProductShortScene = z.infer<typeof ProductShortSceneSchema>

// Scene prop types
export type HeroSceneProps = z.infer<typeof HeroSceneSchema>
export type BenefitsSceneProps = z.infer<typeof BenefitsSceneSchema>
export type PricingSceneProps = z.infer<typeof PricingSceneSchema>
export type CtaSceneProps = z.infer<typeof CtaSceneSchema>
