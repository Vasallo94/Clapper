import { CalculateMetadataFunction } from "remotion"
import { ProductShortConfig } from "./schema"

export const calculateMetadata: CalculateMetadataFunction<ProductShortConfig> = async ({
  props,
}) => {
  const totalSeconds = props.scenes.reduce((sum, scene) => sum + scene.durationInSeconds, 0)

  return {
    durationInFrames: Math.ceil(totalSeconds * props.fps),
    fps: props.fps,
    width: props.width,
    height: props.height,
  }
}
