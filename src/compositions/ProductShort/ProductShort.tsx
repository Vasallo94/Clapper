import React from "react"
import { ProductShortConfig } from "./schema"
import { BenefitsScene } from "./scenes/BenefitsScene"
import { CtaScene } from "./scenes/CtaScene"
import { HeroScene } from "./scenes/HeroScene"
import { PricingScene } from "./scenes/PricingScene"
import { CompositionShell } from "../../shared/CompositionShell"

export const ProductShort: React.FC<ProductShortConfig> = (config) => {
  return (
    <CompositionShell
      config={config}
      theme="linea-directa"
      musicLoop
      renderScene={(scene) => (
        <>
          {scene.type === "hero" && <HeroScene {...scene} />}
          {scene.type === "benefits" && <BenefitsScene {...scene} />}
          {scene.type === "pricing" && <PricingScene {...scene} />}
          {scene.type === "cta" && <CtaScene {...scene} />}
        </>
      )}
    />
  )
}
