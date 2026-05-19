# DeepAgent Graph Redesign — Subgrafos, Voice Generator y Validacion

**Fecha:** 2026-04-21
**Estado:** Draft
**Autor:** Enrique Vasallo + Claude

## Problema

El pipeline actual del DeepAgent tiene un grafo plano de 4 subagentes secuenciales (`researcher → copywriter → director → sound_engineer`) con gaps criticos:

1. **Voice Generator ausente del grafo** — la generacion de voiceover (TTS) ocurre como subproceso silencioso dentro de `scripts/render.ts`. El agente no tiene visibilidad, no puede decidir parametros de voz, y no recibe feedback de errores.
2. **Sin validacion de coherencia** — el config.json se envia a render sin verificar que los assets referenciados existen (voiceId, libraryId, escenas custom).
3. **Sin review post-render** — no se verifica que el MP4 resultante tenga la duracion correcta o contenga audio.
4. **Scene Creator desconectado** — el subgrafo `lint → register → validate` existe pero esta comentado en el orquestador.
5. **Pocos checkpoints humanos** — solo la escaleta tiene aprobacion humana. El timing del director, la seleccion de audio y el resultado final no pasan por revision.
6. **Sound Engineer depende de APIs no disponibles** — ElevenLabs/Lyria no estan accesibles actualmente. El flujo debe funcionar solo con libreria local.

## Principio de diseno

**Automatizar la ejecucion, no el criterio.** Las decisiones creativas (contenido, timing, voz, sonido, resultado final) pasan por checkpoint humano. La ejecucion tecnica (TTS, copia de archivos, lint, bundle, render) es automatica.

## Arquitectura: 3 subgrafos

El grafo plano se reorganiza en 3 subgrafos que el orquestador encadena secuencialmente.

### Subgrafo 1 — Creative

```
researcher → copywriter ──[CP1: escaleta]──→ director ──[CP2: timing/beats]
```

**Nodos existentes, sin cambios funcionales:**

- `researcher` — busca info del producto/tema. Model: `gemini-3.1-flash-lite-preview`. Tools: `web_search`, `web_fetch`, `scrape_product`.
- `copywriter` — genera escaleta y config.json. Tools: `present_escaleta` (interrupt), `query_scene_catalog`. **CP1**: el usuario aprueba la escaleta.
- `director` — anade timing, beats y sincronizacion narrativa. Sin tools propias (recibe y devuelve config).

**Cambio: checkpoint post-director (CP2).** El director actualmente no tiene checkpoint. Se anade un `present_direction` interrupt que muestra al usuario el timing y beats propuestos antes de pasar a produccion. Requiere nueva tool en `tools/render.py`.

### Subgrafo 2 — Production

```
audio_planner ──[CP3: carta audio]──→ fork ──→ voice_generator ──→ join → scene_creator ──[CP4: codigo]◇→ validator ──[CP5: warnings]◇
                                           └──→ sound_engineer ──┘
```

**Nodos nuevos:**

#### `audio_planner`

- **Responsabilidad:** Preparar propuesta unificada de audio (voz + musica + SFX) a partir del config.json dirigido.
- **Input:** config.json con timing y beats del director.
- **Logica:**
  1. Lee la libreria local (`public/audio/library/`) via `list_audio_library()`.
  2. Propone seccion `voiceover` (provider: gemini, voiceId, idioma, texto por escena).
  3. Propone seccion `soundDesign` (musicBed de libreria, SFX de libreria).
  4. Presenta carta de audio unificada via `present_audio_chart()` (interrupt).
- **Output:** config.json con secciones `voiceover` y `soundDesign` aprobadas por el usuario.
- **Tools:** `present_audio_chart` (nuevo, interrupt), `list_audio_library` (existente).
- **CP3:** El usuario ve voz + musica + SFX juntos y aprueba o pide cambios.

#### `voice_generator`

- **Responsabilidad:** Ejecutar generacion TTS para cada escena con voiceover.
- **Input:** config.json con seccion `voiceover` aprobada.
- **Provider:** Gemini TTS exclusivamente (ElevenLabs no disponible actualmente).
- **Logica:**
  1. Ejecuta `scripts/generate-voiceover.ts` con el config path.
  2. Parsea stdout/stderr para detectar exito o error por escena.
  3. Devuelve resultado estructurado con paths de audio generados.
- **Tools:** `generate_voiceover(config_path)` (nuevo, wrapper del script existente).
- **Error handling:** Si falla una escena, reporta cual y por que (timeout, API error, texto vacio). No reintenta automaticamente.
- **Sin checkpoint** — la decision de voz ya fue aprobada en CP3.

#### `sound_engineer` (modificado)

- **Responsabilidad:** Preparar assets de musica y SFX.
- **Input:** config.json con seccion `soundDesign` aprobada.
- **Modo actual (sin API):** Solo copia tracks de libreria local.
  - Music bed: copia `public/audio/library/<libraryId>.mp3` a `public/audio/<config.id>/music-bed.mp3`.
  - SFX: copia `public/audio/library/sfx-<id>.mp3` a `public/audio/<config.id>/sfx-<id>.mp3`.
- **Modo futuro (con API):** Reactiva `generate_audio` para generar via Lyria/ElevenLabs. El cambio es transparente — solo se anade un fallback chain.
- **Tools:**
  - `list_audio_library()` (existente).
  - `copy_library_track(track_id, config_id)` (nuevo) — copia un track de libreria al directorio del config.
  - `generate_audio(config_path)` (existente, deshabilitado temporalmente).
- **Sin checkpoint** — aprobado en CP3.

#### `scene_creator` (integrado)

- **Responsabilidad:** Detectar escenas custom no registradas y generar componentes React.
- **Deteccion:** El propio scene_creator compara los `type` del config contra `customSceneRegistry.ts`. Si todos existen, se salta (status: "skipped"). Si falta alguno, genera el componente.
- **Grafo interno existente:** `lint → register → validate` con retry loop (max 3 intentos).
- **CP4 (condicional):** Si genera codigo custom, presenta al usuario el componente para revision via `present_custom_scene` (interrupt nuevo). Solo se activa si hay escenas custom.
- **Tools:** `write_scene`, `read_scene` (existentes).
- **Nota:** El `validator` posterior NO repite la deteccion de escenas custom. Solo verifica que el registro final es coherente con el config.

#### `validator`

- **Responsabilidad:** Verificar coherencia del config.json contra assets reales en disco.
- **Checks:**
  1. Cada `type` de escena referenciado existe en el registro de escenas.
  2. Si `voiceover.enabled`, verificar que existen los MP3 en `public/voiceover/<config.id>/`.
  3. Si `soundDesign.enabled`, verificar que music bed y SFX existen en `public/audio/<config.id>/`.
  4. Los `voiceId` son validos para el provider configurado.
  5. La duracion total calculada coincide con la suma de duraciones de escenas.
  6. No hay `libraryId` referenciados que no existan en `public/audio/library/`.
- **Output:** Lista de errores (bloqueantes) y warnings (no bloqueantes).
- **Errores bloqueantes:** Detienen el pipeline. El orquestador reporta al usuario con contexto accionable.
- **CP5 (condicional):** Si hay warnings no bloqueantes, presenta al usuario para decidir si continua o corrige.
- **Tools:** `validate_config(config_path)` (nuevo) — ejecuta los checks contra el filesystem.

### Subgrafo 3 — Delivery

```
render → reviewer ──[CP6: review final]
```

#### `render` (modificado)

- **Cambio respecto a actual:** El `submit_render` ya no llama a `generate-voiceover.ts` ni `generate-sound-design.ts` — esos pasos se ejecutaron en el Production subgraph. El render service solo hace bundle + renderMedia.
- **Implicacion:** `scripts/render.ts` necesita un flag `--skip-audio-generation` o el render service debe invocar un script de render-only que no llame a los scripts de generacion de audio.
- **Progress:** Se mantiene el polling via `check_render_status`.

#### `reviewer` (nuevo)

- **Responsabilidad:** Verificar el resultado del render.
- **Checks:**
  1. El MP4 existe y tiene tamano > 0.
  2. Duracion del MP4 (via ffprobe) coincide con la esperada del config (tolerancia +/- 0.5s).
  3. Si hay voiceover/soundDesign, verificar que el audio no esta en silencio total (ffprobe audio stream present).
- **CP6:** Presenta informe al usuario:
  - Duracion real vs esperada.
  - Audio presente si/no.
  - Tamano del archivo.
  - El usuario acepta o rechaza el resultado.
- **Tools:** `review_render(output_path, config_path)` (nuevo) — ejecuta ffprobe y checks.

## State schemas

### OrchestratorState

```python
class OrchestratorState(TypedDict):
    user_request: str
    phase: str  # "creative" | "production" | "delivery" | "done" | "error"
    config: dict  # config.json que fluye entre subgrafos
    errors: list[str]
```

### ProductionState

```python
class ProductionState(TypedDict):
    config: dict
    audio_plan: dict                    # propuesta aprobada del audio_planner
    voiceover_result: VoiceoverResult
    sound_result: SoundResult
    scene_creator_result: SceneCreatorResult
    validation_errors: list[str]
    validation_warnings: list[str]
    status: str  # "planning" | "generating" | "validating" | "ready" | "error"

class VoiceoverResult(TypedDict):
    success: bool
    scene_paths: dict[str, str]   # scene_index -> path al MP3
    errors: list[str]             # errores por escena

class SoundResult(TypedDict):
    success: bool
    music_bed_path: str | None
    sfx_paths: dict[str, str]     # sfx_id -> path
    errors: list[str]

class SceneCreatorResult(TypedDict):
    activated: bool               # si se activo
    scenes_created: list[str]     # component_ids creados
    status: str                   # "done" | "error" | "skipped"
    errors: list[str]
```

### DeliveryState

```python
class DeliveryState(TypedDict):
    config: dict
    job_id: str
    render_status: str      # "rendering" | "done" | "error"
    render_progress: int    # 0-100
    output_path: str
    review: ReviewResult

class ReviewResult(TypedDict):
    mp4_exists: bool
    file_size_bytes: int
    duration_seconds: float
    expected_duration_seconds: float
    duration_match: bool
    has_audio: bool
    accepted: bool | None    # None = pendiente de CP6
```

## Tools nuevas

| Tool                   | Modulo                | Tipo       | Descripcion                                                  |
| ---------------------- | --------------------- | ---------- | ------------------------------------------------------------ |
| `present_direction`    | `tools/render.py`     | interrupt  | Presenta timing/beats del director para aprobacion (CP2)     |
| `present_audio_chart`  | `tools/sound.py`      | interrupt  | Presenta carta de audio unificada — voz + musica + SFX (CP3) |
| `generate_voiceover`   | `tools/voice.py`      | subprocess | Wrapper de `scripts/generate-voiceover.ts`                   |
| `copy_library_track`   | `tools/sound.py`      | filesystem | Copia track de libreria a directorio del config              |
| `present_custom_scene` | `tools/scene.py`      | interrupt  | Presenta codigo de escena custom para revision (CP4)         |
| `validate_config`      | `tools/validation.py` | filesystem | Verifica coherencia config vs assets en disco                |
| `review_render`        | `tools/validation.py` | subprocess | Ejecuta ffprobe y checks post-render                         |

## Checkpoints humanos

| #   | Nodo          | Tipo interrupt                  | Que ve el usuario                                                             | Cuando se salta           |
| --- | ------------- | ------------------------------- | ----------------------------------------------------------------------------- | ------------------------- |
| CP1 | copywriter    | `escaleta_checkpoint`           | Escaleta: escenas, contenido, estructura                                      | Nunca — siempre requerido |
| CP2 | director      | `direction_checkpoint`          | Timing por escena, beats, sincronizacion                                      | Nunca — siempre requerido |
| CP3 | audio_planner | `audio_chart_checkpoint`        | Carta unificada: voz (provider, voiceId, textos) + musica (track) + SFX (ids) | Nunca — siempre requerido |
| CP4 | scene_creator | `custom_scene_checkpoint`       | Codigo React del componente custom generado                                   | Si no hay escenas custom  |
| CP5 | validator     | `validation_warning_checkpoint` | Lista de warnings no bloqueantes                                              | Si no hay warnings        |
| CP6 | reviewer      | `review_checkpoint`             | Informe: duracion, audio, tamano, resultado                                   | Nunca — siempre requerido |

## Cambios al render service

### Opcion: flag `--skip-audio-generation` en `scripts/render.ts`

El render script actual ejecuta `generate-voiceover.ts` y `generate-sound-design.ts` antes de bundlear. Con el nuevo flujo, esos pasos ya se ejecutaron en el Production subgraph. Se anade un flag:

```typescript
const skipAudio = process.argv.includes("--skip-audio-generation")

if (config.voiceover?.enabled && !skipAudio) {
  // generate voiceover
}

if (config.soundDesign?.enabled && !skipAudio) {
  // generate sound design
}
```

El render service pasa este flag cuando el render viene del pipeline del agente. Cuando se ejecuta render.ts manualmente (CLI), el comportamiento no cambia.

## Cambios al prompt del orquestador

El prompt de `prompts/orchestrator.md` debe actualizarse para reflejar:

1. El nuevo equipo: `researcher`, `copywriter`, `director`, `audio_planner`, `voice_generator`, `sound_engineer`, `scene_creator`, `validator`, `reviewer`.
2. El flujo de 3 subgrafos con las dependencias entre ellos.
3. Las stop conditions actualizadas: el pipeline termina despues de CP6 (review final), no despues de check_render_status.
4. Que voice_generator y sound_engineer corren en paralelo.
5. Que scene_creator y validator warnings son condicionales.

## Paralelismo voice_generator / sound_engineer

El orquestador debe ejecutar `voice_generator` y `sound_engineer` en paralelo dentro del production subgraph. Opciones de implementacion:

1. **LangGraph `Send()` API** — el production subgraph usa `Send()` para dispatch paralelo a ambos nodos, con un nodo `join` que espera ambos resultados. Esto es nativo de LangGraph y no depende de DeepAgents.
2. **DeepAgents parallel dispatch** — si la libreria `deepagents` soporta dispatch de multiples subagentes en paralelo, usarlo directamente.

**Decision:** Verificar la API de DeepAgents durante implementacion. Si no soporta paralelo, usar LangGraph `Send()` dentro de un subgrafo compilado que encapsula el fork/join.

## Restricciones actuales

- **Gemini TTS unico provider de voz.** ElevenLabs no disponible. El schema soporta ambos, pero el audio_planner solo propone gemini.
- **Sound design solo de libreria.** Sin generacion API (Lyria/ElevenLabs). El sound_engineer copia tracks existentes de `public/audio/library/`. El diseno deja hueco para reactivar generacion.
- **Scene Creator depende de CompiledSubAgent.** La integracion con DeepAgents necesita verificarse — el grafo LangGraph existe pero no se ha integrado como subagente.
- **ffprobe requerido para reviewer.** El nodo `review_render` necesita ffprobe instalado para inspeccionar el MP4. Verificar disponibilidad en el entorno.

## Archivos afectados

### Nuevos

| Archivo                                           | Descripcion                              |
| ------------------------------------------------- | ---------------------------------------- |
| `packages/agent/src/tools/voice.py`               | Tool `generate_voiceover`                |
| `packages/agent/src/tools/validation.py`          | Tools `validate_config`, `review_render` |
| `packages/agent/src/tools/scene.py`               | Tool `present_custom_scene`              |
| `packages/agent/src/subagents/audio_planner.py`   | Definicion del subagente audio_planner   |
| `packages/agent/src/subagents/voice_generator.py` | Definicion del subagente voice_generator |
| `packages/agent/src/subagents/validator.py`       | Definicion del nodo validator            |
| `packages/agent/src/subagents/reviewer.py`        | Definicion del nodo reviewer             |
| `packages/agent/prompts/audio_planner.md`         | Prompt del audio_planner                 |
| `packages/agent/prompts/voice_generator.md`       | Prompt del voice_generator               |
| `packages/agent/prompts/validator.md`             | Prompt del validator                     |
| `packages/agent/prompts/reviewer.md`              | Prompt del reviewer                      |

### Modificados

| Archivo                                          | Cambio                                                 |
| ------------------------------------------------ | ------------------------------------------------------ |
| `packages/agent/src/orchestrator.py`             | Nuevo flujo con 3 subgrafos, 9 subagentes, paralelismo |
| `packages/agent/src/subagents/__init__.py`       | Exportar nuevos subagentes                             |
| `packages/agent/src/subagents/sound_engineer.py` | Anadir `copy_library_track`, modo library-only         |
| `packages/agent/src/tools/sound.py`              | Anadir `present_audio_chart`, `copy_library_track`     |
| `packages/agent/src/tools/render.py`             | Anadir `present_direction`                             |
| `packages/agent/prompts/orchestrator.md`         | Nuevo flujo, nuevo equipo, nuevas stop conditions      |
| `packages/agent/prompts/sound_engineer.md`       | Modo library-only, sin generacion API                  |
| `scripts/render.ts`                              | Flag `--skip-audio-generation`                         |
| `packages/render-service/src/server.ts`          | Pasar flag cuando viene del agente                     |

## Criterios de aceptacion

1. El pipeline completo genera un video desde un prompt del usuario, pasando por los 6 checkpoints humanos.
2. `voice_generator` genera audio TTS via Gemini para cada escena con voiceover y reporta errores por escena.
3. `sound_engineer` copia tracks de libreria sin llamar APIs externas.
4. `voice_generator` y `sound_engineer` ejecutan en paralelo dentro del production subgraph.
5. `scene_creator` genera componentes React custom cuando se necesitan y los valida (lint + bundle).
6. `validator` detecta assets faltantes y reporta errores accionables.
7. `reviewer` verifica duracion y audio del MP4 via ffprobe.
8. El render manual via CLI (`npx tsx scripts/render.ts config.json`) sigue funcionando sin cambios.
9. Los errores en cualquier nodo se propagan al orquestador con contexto suficiente para informar al usuario.
