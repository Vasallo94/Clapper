---
name: sound-engineer
description: Genera el diseno sonoro de un video Remotion — musica de fondo, SFX por escena y ducking dinamico. Lee el config.json existente, propone una carta de sonido al usuario y genera los archivos de audio via ElevenLabs. Invoca con /sound-engineer path/to/config.json
---

# Sound Engineer

Skill de diseno sonoro para videos Remotion. Lee un config.json que ya tiene escenas, voiceover y direccion editorial, y anade la capa de audio ambiental: musica de fondo con ducking y efectos de sonido por escena.

## Cuando usarla

- Despues del director pass (necesita timing y beats)
- Antes de renderizar la version final
- Para anadir personalidad sonora a un video que ya suena "seco"

## Cadena de agentes

```
tutorial-generator → director → sound-engineer → render
```

## Prerequisitos

- `config.json` con escenas, voiceover y beats/timing
- Variable de entorno `ELEVENLABS_API_KEY`
- Directorio `public/audio/library/` con loops base (opcional, el skill funciona con custom prompts)

## Workflow (5 pasos)

### Paso 1 — Analisis

Lee el config y extrae:

- `brief.tone`, `brief.platform`, `brief.audience`
- Escenas por tipo (terminal, intro, custom/block-diagram, etc.)
- Beats con `emphasis: "high"` (puntos de impacto)
- Duracion total del video
- Si ya existe `soundDesign` (re-run vs primera vez)

### Paso 2 — Propuesta de music bed

1. Escanea `public/audio/library/` buscando loops existentes
2. Mapea el tono del brief a tags:
   - `"personal-didactic"` → lofi-tech, minimal-ambient
   - `"corporate"` → corporate-warm
   - `"energetic"` → upbeat-tech
3. Propone 2-3 opciones al usuario con recomendacion
4. Si ninguna encaja, propone un prompt custom para la Music API
5. **Presenta via `AskUserQuestion`** — el usuario elige

### Paso 3 — Carta de sonido

Aplica el mapeo automatico por defecto:

| Tipo de escena         | SFX por defecto                                                         |
| ---------------------- | ----------------------------------------------------------------------- |
| `intro`                | Swoosh sutil en linea de acento (`trigger: "accent-line"`)              |
| `terminal`             | Teclado mecanico durante typing (`trigger: "typewriter"`, `loop: true`) |
| `custom/block-diagram` | Chime al revelar cada bloque (`trigger: "reveal"`)                      |
| `custom/flow-diagram`  | Whoosh del orb entre nodos (`trigger: "reveal"`)                        |
| `custom/file-explorer` | Click de carpeta al expandir (`trigger: "reveal"`)                      |
| `callout`              | Tono de atencion sutil (`trigger: "scene-start"`)                       |
| `outro`                | Stinger musical de cierre (`trigger: "scene-start"`)                    |

Ajusta densidad segun tono:

- Tono corporate/formal → menos SFX, solo music bed + transiciones
- Tono personal/didactico → mas SFX, ASMR en teclado, chimes en reveals
- Tono energetico → mas stingers, hits en beats de emphasis alta

Presenta tabla escena-por-escena al usuario:

```
CARTA DE SONIDO — "[titulo del video]"

Music bed: [seleccion] (loop, -18dB, duck a -26dB durante voz)

Escena 0 (intro, Xs):      [SFX asignados]
Escena 1 (terminal, Xs):   [SFX asignados]
...

Ducking: -26dB durante voz, fade 400ms
Transiciones: [resumen de gaps]
```

**Presenta via `AskUserQuestion`** — itera sin limite hasta aprobacion.

### Paso 4 — Escritura del config

Escribe la seccion `soundDesign` en el config.json:

```json
{
  "soundDesign": {
    "enabled": true,
    "musicBed": {
      "libraryId": "lofi-tech",
      "volume": -18,
      "duckingVolume": -26,
      "fadeInMs": 2000,
      "fadeOutMs": 3000,
      "duckingFadeMs": 400
    },
    "sfx": [
      {
        "id": "keyboard",
        "prompt": "soft mechanical cherry mx keyboard typing in quiet room, ASMR, gentle clicks",
        "trigger": "typewriter",
        "sceneTypes": ["terminal"],
        "loop": true,
        "volume": -14
      }
    ]
  }
}
```

### Paso 5 — Generacion de audio

Ejecuta el script:

```bash
npx tsx scripts/generate-sound-design.ts path/to/config.json
```

Reporta:

- Archivos generados y tamanos
- Coste estimado de API (SFX + Music)
- Warnings si algun archivo no se genero

**No renderiza** — eso lo hace `render.ts` en el siguiente paso de la cadena.

## Prompts de SFX recomendados

Estos prompts producen buenos resultados con la SFX API V2:

- **Teclado**: `"soft mechanical keyboard typing in quiet room, cherry mx switches, gentle ASMR clicks, no background noise"`
- **Swoosh**: `"subtle digital UI swoosh, soft, clean, short, modern interface sound"`
- **Chime**: `"gentle digital notification chime, minimal, single note, warm tone, UI sound"`
- **Whoosh**: `"soft particle whoosh traveling left to right, digital, ethereal, short"`
- **Click carpeta**: `"soft mouse click on folder, minimal UI interaction sound, clean"`
- **Tono atencion**: `"subtle attention tone, two soft notes ascending, warm, non-intrusive"`
- **Stinger cierre**: `"short musical stinger, lofi ending tag, warm, 2 seconds, fade out"`

## Volumenes recomendados

| Capa                | Volumen | Notas                       |
| ------------------- | ------- | --------------------------- |
| Music bed (normal)  | -18 dB  | Audible pero no distrae     |
| Music bed (ducking) | -26 dB  | Apenas perceptible bajo voz |
| Teclado ASMR        | -14 dB  | Presente, textura           |
| Chimes/clicks       | -15 dB  | Puntual, no agresivo        |
| Swoosh/whoosh       | -16 dB  | Ambiental                   |
| Stinger             | -10 dB  | Cierre con presencia        |

## Reglas

- El humano siempre valida la carta de sonido antes de generar
- No anadir SFX a escenas que ya estan cargadas de informacion visual
- Si el video dura menos de 15s, solo music bed (sin SFX)
- Respetar el `transitionMs` del director para el timing de ducking
- Cache agresivo: no regenerar archivos cuyo fingerprint no ha cambiado
