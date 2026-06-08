import { interpolate } from "remotion"
import type { SfxEntry, SoundDesign, Timing } from "./direction"
import { getSceneAudioDelayMs, msToFrames } from "./direction"

/** Convert decibels to linear gain (0–1). -18dB ≈ 0.126, -26dB ≈ 0.05 */
export const dbToLinear = (db: number): number => Math.pow(10, db / 20)

export interface SceneAudioInfo {
  startFrame: number
  durationFrames: number
  timing?: Timing | null
  audioDurationMs: number | null // null = no voiceover for this scene
  sceneType: string
}

/**
 * Compute music bed volume at a given frame.
 * Handles ducking during voiceover, transition gaps, and global fades.
 */
export function computeMusicVolume(
  frame: number,
  scenes: SceneAudioInfo[],
  musicBed: { volume: number; duckingVolume: number; fadeInMs: number; fadeOutMs: number; duckingFadeMs: number },
  fps: number,
  totalFrames: number,
): number {
  const baseGain = dbToLinear(musicBed.volume)
  const duckGain = dbToLinear(musicBed.duckingVolume)
  const fadeInFrames = msToFrames(musicBed.fadeInMs, fps)
  const fadeOutFrames = msToFrames(musicBed.fadeOutMs, fps)
  const duckFadeFrames = Math.max(1, msToFrames(musicBed.duckingFadeMs, fps))

  // Global fade in/out envelope
  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const fadeOut = interpolate(frame, [totalFrames - fadeOutFrames, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const envelope = fadeIn * fadeOut

  // Determine if voiceover is active at this frame
  let voiceActive = false
  for (const scene of scenes) {
    if (frame < scene.startFrame || frame >= scene.startFrame + scene.durationFrames) continue
    if (!scene.audioDurationMs) continue

    const audioDelayMs = getSceneAudioDelayMs(scene.timing)
    const audioStartFrame = scene.startFrame + msToFrames(audioDelayMs, fps)
    const audioEndFrame = audioStartFrame + msToFrames(scene.audioDurationMs, fps)

    if (frame >= audioStartFrame && frame < audioEndFrame) {
      voiceActive = true
      break
    }
  }

  // Proximity-based ducking: find distance to nearest voice boundary and interpolate.
  let minDistToEdge = duckFadeFrames + 1
  for (const scene of scenes) {
    if (!scene.audioDurationMs) continue
    const audioDelayMs = getSceneAudioDelayMs(scene.timing)
    const audioStartFrame = scene.startFrame + msToFrames(audioDelayMs, fps)
    const audioEndFrame = audioStartFrame + msToFrames(scene.audioDurationMs, fps)

    const distToStart = Math.abs(frame - audioStartFrame)
    const distToEnd = Math.abs(frame - audioEndFrame)
    minDistToEdge = Math.min(minDistToEdge, distToStart, distToEnd)
  }

  // Blend between base and duck based on proximity to voice boundary
  const blendProgress = Math.min(1, minDistToEdge / duckFadeFrames)
  const gain = voiceActive
    ? duckGain + (baseGain - duckGain) * (1 - blendProgress)
    : baseGain - (baseGain - duckGain) * (1 - blendProgress)

  return gain * envelope
}

/**
 * Get SFX entries that apply to a given scene, considering sceneTypes and overrides.
 */
export function getSceneSfxEntries(sceneIndex: number, sceneType: string, soundDesign: SoundDesign): SfxEntry[] {
  const overrides = soundDesign.sceneOverrides?.[String(sceneIndex)]
  const disabledIds = new Set(overrides?.disableSfx ?? [])

  const matchingSfx = soundDesign.sfx.filter((sfx) => {
    if (disabledIds.has(sfx.id)) return false
    if (!sfx.sceneTypes || sfx.sceneTypes.length === 0) return true
    return sfx.sceneTypes.some((t) => sceneType.includes(t))
  })

  const extraSfx = overrides?.extraSfx ?? []

  return [...matchingSfx, ...extraSfx]
}

/**
 * Calculate the frame (relative to scene start) where an SFX should trigger.
 */
export function sfxTriggerFrame(sfx: SfxEntry, sceneTiming: Timing | null | undefined, fps: number): number {
  switch (sfx.trigger) {
    case "scene-start":
      return msToFrames(sceneTiming?.leadInMs ?? 0, fps)
    case "typewriter":
      // Start with motion, typewriter begins at leadIn
      return msToFrames(sceneTiming?.leadInMs ?? 0, fps)
    case "accent-line":
      // Accent line typically fires at audioStart (first narrated beat)
      return msToFrames((sceneTiming?.leadInMs ?? 0) + (sceneTiming?.audioStartMs ?? 0), fps)
    case "reveal":
      // Reveal fires at motion start (blocks/files appear)
      return msToFrames(sceneTiming?.leadInMs ?? 0, fps)
    case "beat":
      // Beat-triggered SFX start at motion start; actual per-beat timing handled in composition
      return msToFrames(sceneTiming?.leadInMs ?? 0, fps)
    case "transition":
      // Transition SFX play at frame 0 (before leadIn, during the gap)
      return 0
    default:
      return 0
  }
}

/**
 * Calculate the end frame for a looping SFX (relative to scene start).
 * Returns undefined for non-looping SFX.
 */
export function sfxEndFrame(sfx: SfxEntry, sceneDurationFrames: number): number | undefined {
  if (!sfx.loop) return undefined
  // Looping SFX play for the entire scene duration
  return sceneDurationFrames
}
