---
name: voiceover
description: Adding AI-generated voiceover to Remotion compositions using TTS
metadata:
  tags: voiceover, audio, elevenlabs, tts, speech, calculateMetadata, dynamic duration
---

# Adding AI voiceover to a Remotion composition

Use ElevenLabs TTS to generate speech audio per scene, then use [`calculateMetadata`](./calculate-metadata) to dynamically size the composition to match the audio.

## Prerequisites

By default this guide uses **ElevenLabs** as the TTS provider (`ELEVENLABS_API_KEY` environment variable). Users may substitute any TTS service that can produce an audio file.

If the user has not specified a TTS provider, recommend ElevenLabs and ask for their API key.

Ensure the environment variable is available when running the generation script:

```bash
node --strip-types generate-voiceover.ts
```

## Generating audio with ElevenLabs

Create a script that reads the config, calls the ElevenLabs API for each scene, and writes MP3 files to the `public/` directory so Remotion can access them via `staticFile()`.

The core API call for a single scene:

```ts title="generate-voiceover.ts"
const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
  method: "POST",
  headers: {
    "xi-api-key": process.env.ELEVENLABS_API_KEY!,
    "Content-Type": "application/json",
    Accept: "audio/mpeg",
  },
  body: JSON.stringify({
    text: "Welcome to the show.",
    model_id: "eleven_multilingual_v2",
    seed: 42,
    previous_text: "In the last scene we introduced the problem.",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.3,
      speed: 1.03,
      use_speaker_boost: true,
    },
  }),
})

const audioBuffer = Buffer.from(await response.arrayBuffer())
writeFileSync(`public/voiceover/${compositionId}/${scene.id}.mp3`, audioBuffer)
```

## Recommended config surface

Expose these values in `config.json` instead of burying them inside the script:

- `voiceover.provider`
- `voiceover.voiceId`
- `voiceover.elevenlabs.modelId`
- `voiceover.elevenlabs.outputFormat`
- `voiceover.elevenlabs.languageCode`
- `voiceover.elevenlabs.seed`
- `voiceover.elevenlabs.enableLogging`
- `voiceover.elevenlabs.applyTextNormalization`
- `voiceover.elevenlabs.voiceSettings`
- `voiceover.scenes[n].elevenlabs` for scene-level overrides

Scene text should remain the primary source of delivery direction. Put pacing and emphasis cues into the line itself and only use provider knobs to refine the performance.

Useful ElevenLabs controls:

- `stability`: lower values increase variation and expressiveness
- `similarityBoost`: higher values keep the generated voice closer to the source timbre
- `style`: increases dramatic styling on supported models
- `speed`: adjusts speaking speed without changing composition timing logic
- `useSpeakerBoost`: can improve clarity and presence
- `previousText` / `nextText`: improve continuity between adjacent clips
- `pronunciationDictionaries`: keep branded or technical terms consistent
- `applyTextNormalization`: control how aggressively numbers and abbreviations are normalized

Use inline pauses such as `<break time="0.3s" />` sparingly when a specific beat needs extra breathing room.

## Dynamic composition duration with calculateMetadata

Use [`calculateMetadata`](./calculate-metadata.md) to measure the [audio durations](./get-audio-duration.md) and set the composition length accordingly.

```tsx
import { CalculateMetadataFunction, staticFile } from "remotion"
import { getAudioDuration } from "./get-audio-duration"

const FPS = 30

const SCENE_AUDIO_FILES = [
  "voiceover/my-comp/scene-01-intro.mp3",
  "voiceover/my-comp/scene-02-main.mp3",
  "voiceover/my-comp/scene-03-outro.mp3",
]

export const calculateMetadata: CalculateMetadataFunction<Props> = async ({ props }) => {
  const durations = await Promise.all(SCENE_AUDIO_FILES.map((file) => getAudioDuration(staticFile(file))))

  const sceneDurations = durations.map((durationInSeconds) => {
    return durationInSeconds * FPS
  })

  return {
    durationInFrames: Math.ceil(sceneDurations.reduce((sum, d) => sum + d, 0)),
  }
}
```

The computed `sceneDurations` are passed into the component via a `voiceover` prop so the component knows how long each scene should be.

If the composition uses [`<TransitionSeries>`](./transitions.md), subtract the overlap from total duration: [./transitions.md#calculating-total-composition-duration](./transitions.md#calculating-total-composition-duration)

## Rendering audio in the component

See [audio.md](./audio.md) for more information on how to render audio in the component.

## Delaying audio start

See [audio.md#delaying](./audio.md#delaying) for more information on how to delay the audio start.
