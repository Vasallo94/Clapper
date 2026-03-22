// src/compositions/ClaudeCodeTutorial/scenes/CustomScene.tsx
import React from "react"
import { customSceneRegistry } from "../customSceneRegistry"

interface CustomSceneProps {
  componentId: string
  props?: Record<string, unknown>
}

export const CustomScene: React.FC<CustomSceneProps> = ({ componentId, props = {} }) => {
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
  return <Component {...props} />
}
