---
name: gemini-tts
description: Referencia tecnica de Gemini TTS — voces disponibles, audio tags, formato multi-speaker, framework de prompting y limitaciones. Consulta al planificar voiceover o generar audio.
---

# Gemini TTS Reference

Technical reference for the Gemini TTS model (`gemini-3.1-flash-tts-preview`).

## Available Voices (30)

| Voice        | Character               | Best for                  |
| ------------ | ----------------------- | ------------------------- |
| Orus         | Warm, didactic          | Tutorials, explainers     |
| Kore         | Corporate, professional | Business content          |
| Puck         | Energetic, young        | Social media, shorts      |
| Charon       | Deep, authoritative     | Narration, serious topics |
| Leda         | Soft, feminine          | Calm, intimate content    |
| Zephyr       | Neutral, calm           | General purpose           |
| Aoede        | Bright, musical         | Creative, upbeat content  |
| Fenrir       | Bold, dramatic          | Impact moments, trailers  |
| Achernar     | Clear, precise          | Technical content         |
| Algieba      | Warm, resonant          | Storytelling              |
| Autonoe      | Gentle, nurturing       | Educational, kids         |
| Callirrhoe   | Melodic, expressive     | Entertainment             |
| Despina      | Crisp, articulate       | News-style delivery       |
| Erinome      | Smooth, sophisticated   | Premium, luxury           |
| Gacrux       | Gruff, textured         | Character voices          |
| Iapetus      | Steady, reliable        | Instructional             |
| Keid         | Light, airy             | Lifestyle content         |
| Laomedeia    | Rich, commanding        | Leadership content        |
| Pulcherrima  | Elegant, refined        | Formal presentations      |
| Rasalgethi   | Deep, thoughtful        | Philosophical content     |
| Sadachbia    | Friendly, approachable  | Conversational            |
| Sadaltager   | Energetic, motivational | Sports, fitness           |
| Schedar      | Mature, wise            | Documentary style         |
| Sulafat      | Playful, quirky         | Fun, casual content       |
| Umbriel      | Mysterious, atmospheric | Suspense, sci-fi          |
| Vindemiatrix | Confident, assertive    | Sales, persuasion         |
| Enceladus    | Warm, inviting          | Welcome messages          |
| Thalassa     | Serene, flowing         | Meditation, relaxation    |
| Proteus      | Versatile, adaptive     | Multi-genre               |
| Dione        | Bright, cheerful        | Celebrations, promos      |

## Audio Tags (Transcript Tags)

Inline modifiers in brackets that control delivery. The TTS engine interprets them as performance directions — no code changes needed, just include them in the text.

### Emotion tags

```
[amazed] This is incredible!
[excited] We just launched the new feature!
[sarcastic] Oh great, another meeting.
[tired] It's been a long day...
[whispers] This is a secret.
[cheerful] Welcome to the show!
[serious] Let's talk about security.
[sad] Unfortunately, the project was cancelled.
```

### Action tags

```
[laughs] That's hilarious!
[sighs] Here we go again.
[gasp] I can't believe it!
[cough] Excuse me.
[giggles] You're funny.
```

### Delivery tags

```
[very fast] This part needs to be quick!
[very slow] Let... that... sink... in.
[shouting] ATTENTION EVERYONE!
[softly] Just between us...
```

### Creative tags

```
[like a radio announcer] Coming up next...
[like a sports commentator] And he scores!
```

### Rules for audio tags

- Place tag BEFORE the text it modifies
- Tags apply until the next tag or end of text
- For non-English text, use English tags: `[whispers] Este es un secreto`
- Use sparingly — 1-2 tags per scene max for natural delivery
- Test with short clips before generating full scenes

## Multi-Speaker Support

Up to 2 speakers per scene. Uses `multi_speaker_voice_config` API instead of `voice_config`.

### Config format

```json
{
  "voiceover": {
    "enabled": true,
    "provider": "gemini",
    "language": "es-ES",
    "speakers": [
      { "name": "Ana", "voiceId": "Leda" },
      { "name": "Carlos", "voiceId": "Orus" }
    ],
    "scenes": {
      "0": "Ana: Bienvenidos al tutorial.\nCarlos: Hoy hablamos de Docker.",
      "1": { "text": "Ana: [excited] Veamos el ejemplo.\nCarlos: Abre tu terminal." }
    }
  }
}
```

When `speakers` is present, multi-speaker mode activates. When absent, single-speaker mode uses `voiceId`.

### Rules

- Exactly 2 speakers (API limit)
- Speaker names in text MUST match names in `speakers` config
- Each speaker gets a different voice — choose contrasting timbres (e.g., Orus + Leda, Charon + Puck)
- Audio tags work inside multi-speaker text
- Output is a single audio stream per scene (one MP3 with both voices)

## Prompting Framework

For best quality, structure text with:

1. **Audio Profile** — who is speaking (name, role, personality)
2. **Scene** — environmental context (studio, outdoors, intimate)
3. **Director's Notes** — style guidance (pacing, accent, energy)
4. **Transcript** — the actual text to speak

For single-speaker, embed guidance via audio tags. For multi-speaker, speaker names provide audio profile context.

## Limitations

- Max 32k token context per request
- No streaming — full generation before response
- Quality drifts on outputs > ~2 minutes
- Split longer narrations into per-scene chunks (pipeline default)
- Rate limits: 3 retries with exponential backoff (15s, 30s, 45s)
