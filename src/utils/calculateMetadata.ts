// src/utils/calculateMetadata.ts
import { CalculateMetadataFunction } from "remotion"

type CompositionConfig = {
  fps: number
  width: number
  height: number
  scenes: { durationInSeconds: number }[]
}

export function createCalculateMetadata<
  T extends CompositionConfig,
>(): CalculateMetadataFunction<T> {
  return async ({ props }) => {
    const totalSeconds = props.scenes.reduce(
      (sum, scene) => sum + scene.durationInSeconds,
      0,
    )

    return {
      durationInFrames: Math.ceil(totalSeconds * props.fps),
      fps: props.fps,
      width: props.width,
      height: props.height,
    }
  }
}
