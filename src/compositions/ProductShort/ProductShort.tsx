import React from "react"
import { AbsoluteFill, Series } from "remotion"
import { ThemeContext } from "../ClaudeCodeTutorial/ThemeContext"
import { ProductShortConfig } from "./schema"
import { BenefitsScene } from "./scenes/BenefitsScene"
import { CtaScene } from "./scenes/CtaScene"
import { HeroScene } from "./scenes/HeroScene"
import { PricingScene } from "./scenes/PricingScene"

export const ProductShort: React.FC<ProductShortConfig> = (config) => {
  return (
    <ThemeContext.Provider value="linea-directa">
      <AbsoluteFill style={{ background: "#FFFFFF" }}>
        <Series>
          {config.scenes.map((scene, i) => {
            const durationInFrames = Math.ceil(scene.durationInSeconds * config.fps)
            return (
              <Series.Sequence key={i} durationInFrames={durationInFrames}>
                {scene.type === "hero" && <HeroScene {...scene} />}
                {scene.type === "benefits" && <BenefitsScene {...scene} />}
                {scene.type === "pricing" && <PricingScene {...scene} />}
                {scene.type === "cta" && <CtaScene {...scene} />}
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}
