---
name: remotion-director
description: Remata configs de vídeo de Remotion con dirección editorial, sincronía entre guion/audio/animación, beats narrativos y timing visual. Úsala después de generar un draft de tutorial o short y antes de renderizar.
---

# Remotion Director

Usa esta skill cuando ya existe un draft de `config.json` y hay que convertirlo en una pieza con ritmo, intención y sincronía clara entre lo que se dice y lo que se ve.

**Prerequisite:** Read the `scene-timing-guide` skill for the Two-Phase timing model. Your beats drive Phase 2 reveals.

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

- Audio sync is auto-calculated from `visualReadyMs` — do NOT set `leadInMs` or `audioStartMs`
- Cada frase importante del guion debe mapear a un beat o a una transición explícita
- Una animación relevante no debe adelantarse a la mención verbal del concepto
- Cada beat debe empujar una sola idea dominante
- El final necesita `tailHoldMs` suficiente para CTA o marca
- `brief` debe existir antes de considerar una pieza “dirigida”

## Reglas music-aware (cuando habra soundDesign)

Estas reglas se aplican siempre, ya que el sound-engineer actuara despues del director:

- **Pausas narrativas**: Asegurar al menos una pausa de voz de 800ms+ cada 15-20 segundos. Aqui la musica “respira” y el espectador procesa informacion.
- **Transiciones entre escenas**: Asignar `transitionMs` en el timing de cada escena:
  - 0ms: corte duro (raro, alta energia)
  - 300-600ms: transicion estandar (mismo hilo narrativo)
  - 800-1200ms: pausa de respiracion (antes de reveal o cambio de tema)
  - 1200-1500ms: pausa dramatica (antes de climax o insight clave)
- **Gaps entre beats**: Dejar 200-400ms de silencio entre beats narrados consecutivos. No todo necesita narracion — la musica debe oirse en esos huecos.
- **Transicion como narrativa**: El silencio entre escenas es una herramienta de storytelling. Una pausa larga antes de “Y ahi entendi que el sistema tiene tres capas” construye anticipacion. La musica sube durante la pausa, luego baja cuando la voz regresa.

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

- `timing.tailHoldMs`
- `timing.transitionMs` — silencio antes de esta escena (0-1500ms, para que la musica respire)
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

- Phase 1 makes the lockup visible automatically (≤200ms). Focus beats on Phase 2 reveals.
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
