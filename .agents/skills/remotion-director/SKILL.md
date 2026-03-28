---
name: remotion-director
description: Remata configs de vídeo de Remotion con dirección editorial, sincronía entre guion/audio/animación, beats narrativos y timing visual. Úsala después de generar un draft de tutorial o short y antes de renderizar.
---

# Remotion Director

Usa esta skill cuando ya existe un draft de `config.json` y hay que convertirlo en una pieza con ritmo, intención y sincronía clara entre lo que se dice y lo que se ve.

## Cuándo usarla

- Tutoriales que explican una idea y se sienten atropellados o demasiado bloque
- Shorts que tienen copy correcto pero poca intención visual
- Piezas con voiceover donde el audio y las animaciones no están anclados
- Revisiones finales antes de renderizar una versión pública

## Qué hace

1. Lee `config.json`, `voiceover` y `brief`
2. Detecta problemas de ritmo, hook, CTA y sincronía
3. Reescribe `timing` y `beats` por escena
4. Ajusta el opening, holds, offsets de audio y respiración final
5. Devuelve un `config.json` dirigido y una lista corta de warnings si algo sigue flojo

## Reglas obligatorias

- Ningún vídeo empieza con voz y movimiento mayor en el mismo frame
- Si hay `voiceover`, el `intro` necesita `leadInMs`
- Cada frase importante del guion debe mapear a un beat o a una transición explícita
- Una animación relevante no debe adelantarse a la mención verbal del concepto
- Cada beat debe empujar una sola idea dominante
- El final necesita `tailHoldMs` suficiente para CTA o marca
- `brief` debe existir antes de considerar una pieza “dirigida”

## Modelo que debes producir

### Root

- `brief.platform`
- `brief.audience`
- `brief.goal`
- `brief.promise`
- `brief.tone`
- `brief.cta`
- `brief.hookStrategy`

### Escena

- `timing.leadInMs`
- `timing.audioStartMs`
- `timing.tailHoldMs`
- `timing.minVisualHoldMs`
- `beats[]`

### Beat

- `id`
- `startMs`
- `endMs` opcional
- `narration`
- `visual`
- `animation`
- `emphasis` opcional

## Cómo dirigir una pieza

### Intro

- Deja el lockup visible antes de la primera palabra
- Define cuándo empieza el primer gesto visual fuerte
- Ancla el hook verbal al primer beat narrado

### Escenas medias

- Divide frases largas en beats claros
- Haz que los elementos entren cuando la voz los nombra
- Si la escena explica un sistema, usa un beat por concepto o relación
- En escenas de terminal, Claude debe “escribir” sensiblemente más rápido que el humano para no malgastar timeline
- Si hay locución con ElevenLabs, prefiere ajustar copy, pausas y `voiceSettings` antes que llenar la escena de typing lento

### Outro

- Un beat por CTA o por idea accionable
- El último beat debe dejar respiración de marca

## Salida esperada

- `config.json` actualizado
- 3-6 warnings máximos si algo sigue mal

## Notas

- No inventes escenas nuevas salvo que el problema no pueda resolverse con timing y beats
- Mantén compatibilidad con configs legacy
- Si el draft ya funciona bien, haz cambios mínimos y explícitos
