// src/compositions/ClaudeCodeTutorial/scenes/CustomScene.tsx
import React from "react"
import { customSceneRegistry } from "../customSceneRegistry"
import type { Beat, Timing } from "../../../utils/direction"

interface CustomSceneProps {
  componentId: string
  props?: Record<string, unknown> | null
  timing?: Timing | null
  beats?: Beat[] | null
}

export const CustomScene: React.FC<CustomSceneProps> = ({ componentId, props = {}, timing, beats }) => {
  const Component = customSceneRegistry[componentId]
  if (!Component) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1c1c",
          color: "#ff6b6b",
          fontFamily: "monospace",
          fontSize: 18,
        }}
      >
        ⚠ CustomScene: "{componentId}" not found in customSceneRegistry
      </div>
    )
  }
  return <Component {...props} timing={timing} beats={beats} />
}
