import React from "react"
import { AbsoluteFill, Series } from "remotion"
import { ThemeContext } from "../ClaudeCodeTutorial/ThemeContext"
import { ProductShortConfig } from "./schema"
import { HeroScene } from "./scenes/HeroScene"

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
                {scene.type !== "hero" && (
                  <AbsoluteFill
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "system-ui, sans-serif",
                      fontSize: 48,
                      color: "#1A1A1A",
                    }}
                  >
                    {scene.type}
                  </AbsoluteFill>
                )}
              </Series.Sequence>
            )
          })}
        </Series>
      </AbsoluteFill>
    </ThemeContext.Provider>
  )
}
