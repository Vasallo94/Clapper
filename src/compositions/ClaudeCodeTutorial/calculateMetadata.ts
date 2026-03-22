// src/compositions/ClaudeCodeTutorial/calculateMetadata.ts
import { CalculateMetadataFunction } from "remotion"
import { TutorialConfig } from "./schema"

export const calculateMetadata: CalculateMetadataFunction<TutorialConfig> = async ({
  props,
}) => {
  const totalSeconds = props.scenes.reduce((sum, scene) => {
    return sum + scene.durationInSeconds
  }, 0)

  return {
    durationInFrames: Math.ceil(totalSeconds * props.fps),
    fps: props.fps,
    width: props.width,
    height: props.height,
  }
}
