/**
 * Pure function to calculate total frames from scenes.
 * Shared between Remotion compositions (calculateMetadata) and the web Player.
 */
export function calculateTotalFrames(
  scenes: Array<{ durationInSeconds: number }>,
  fps: number,
  transition?: { type?: string; durationInFrames?: number } | null,
): number {
  const totalSeconds = scenes.reduce((sum, s) => sum + s.durationInSeconds, 0)
  const transitionType = transition?.type ?? "none"
  const transitionDuration = transition?.durationInFrames ?? 15
  const overlapSeconds =
    transitionType !== "none" && scenes.length > 1 ? ((scenes.length - 1) * transitionDuration) / fps : 0
  return Math.ceil((totalSeconds - overlapSeconds) * fps)
}
