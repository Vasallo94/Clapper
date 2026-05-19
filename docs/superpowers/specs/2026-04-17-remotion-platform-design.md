# Remotion Platform — Design Spec

**Fecha**: 2026-04-17
**Autor**: Enrique Vasallo + Claude
**Estado**: Aprobado

## Objetivo

Plataformar el pipeline de generacion de videos Remotion para que usuarios no tecnicos (marketing) puedan generar videos a traves de un chat web, sin tocar la terminal ni configs JSON. Un agente IA orquesta la cadena completa con checkpoints de aprobacion humana.

## Contexto

### Estado actual

Pipeline maduro con 4 eslabones orquestados como skills de Claude Code:

```
tutorial-generator -> director -> sound-engineer -> render
```

- 7 tutoriales generados, 2 composiciones (landscape 1280x720, vertical 1080x1920)
- Voiceover (Gemini/ElevenLabs), sound design, sistema de temas
- El humano aprueba escaleta y carta de sonido via `AskUserQuestion`
- Todo vive en la terminal de Claude Code

### Problema

- Solo Enrique puede usarlo (requiere Claude Code + conocimiento tecnico)
- Marketing no tiene acceso a la terminal
- No hay persistencia de sesiones ni historial de videos generados

## Decisiones de producto

| Decision              | Eleccion                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Modelo de uso         | Asistido con 3 checkpoints humanos                                                       |
| Contexto organizativo | Proyecto interno equipo IA, Linea Directa                                                |
| LLM                   | Agnostico (DeepAgents soporta multiples providers), empezar con el aprobado internamente |
| Interfaz              | Chat web React minimo                                                                    |
| Render infra          | Abstraido como job asincrono, decision de infra diferida                                 |
| Primera iteracion     | Vertical slice: chat -> escaleta -> render                                               |

## Arquitectura

### 3 capas

```
Frontend (React)  <--SSE-->  Orquestador (Python)  <--HTTP-->  Render Worker (Node.js)
```

- **Frontend**: Chat web React minimo con tarjetas de checkpoint, barras de progreso y media embebida
- **Orquestador**: FastAPI + LangGraph + DeepAgents. Grafo de agentes con `interrupt()` en cada checkpoint
- **Render Worker**: Express API sobre el pipeline Remotion existente. No se modifica el codigo de Remotion

### Principios

- El pipeline Node.js actual no se toca. El orquestador Python lo trata como servicio externo
- `config.json` sigue siendo la fuente de verdad entre capas
- Los 3 checkpoints son `interrupt()` nativos de LangGraph
- Cada conversacion es un thread LangGraph con estado persistido
- Los prompts de cada nodo viven en archivos `.md` separados, iterables sin tocar codigo

## Diseno del grafo de agentes

### Nodos

```
START (router)
  |
  v
researcher        -- web_search, web_fetch, read_catalog
  |
  v
copywriter         -- validate_schema
  |
  v
[CHECKPOINT 1: escaleta]  -- aprobar / pedir cambios
  |
  v
director           -- validate_schema, compute_timing
  |
  v
preview_generator  -- render_frame (renderStill por escena)
  |
  v
[CHECKPOINT 2: preview visual]  -- aprobar / pedir cambios
  |
  v
sound_engineer     -- list_audio_library, generate_sfx_preview
  |
  v
[CHECKPOINT 3: carta de sonido]  -- aprobar / pedir cambios
  |
  v
render_dispatcher  -- submit_render_job, check_render_status
  |
  v
END (entrega MP4 URL)
```

### Estado compartido

```python
class VideoState(TypedDict):
    messages: list           # historial del chat
    intent: str              # "tutorial" | "short" | "question"
    research: dict           # contexto investigado
    brief: dict              # plataforma, audiencia, tono
    escaleta: list[dict]     # escenas propuestas
    config_draft: dict       # config.json en construccion
    previews: list[str]      # URLs de thumbnails generados
    sound_design: dict       # carta de sonido propuesta
    config_final: dict       # config.json aprobado
    render_job_id: str       # ID del job de render
    render_status: str       # pending/rendering/done/error
    output_url: str          # URL del MP4 final
```

### Router

Clasifica la intencion del usuario:

- **Generacion nueva** -> flujo completo del grafo
- **Modificacion** -> carga config existente, entra en el nodo apropiado
- **Consulta** -> responde directamente sin entrar en el pipeline

### Comportamiento en checkpoints

1. El grafo se pausa con `interrupt()` y serializa la propuesta como mensaje con metadata estructurada
2. El frontend renderiza la propuesta con formato visual (tarjeta, no JSON crudo)
3. El usuario puede aprobar, pedir cambios (texto libre) o rechazar
4. Si pide cambios -> el grafo vuelve al nodo anterior con el feedback como input
5. Loop sin limite de iteraciones

## Tools del agente

### Tools por nodo

| Nodo              | Tools                                        | Funcion                                                           |
| ----------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| researcher        | `web_search`, `web_fetch`, `read_catalog`    | Buscar info del producto, leer catalogo de escenas                |
| copywriter        | `validate_schema`                            | Validar draft contra Zod via render-service                       |
| director          | `validate_schema`, `compute_timing`          | Calcular timing/beats, validar config                             |
| preview_generator | `render_frame`                               | Renderizar 1 frame estatico por escena (Remotion `renderStill()`) |
| sound_engineer    | `list_audio_library`, `generate_sfx_preview` | Listar musica disponible, generar preview de SFX                  |
| render_dispatcher | `submit_render_job`, `check_render_status`   | Lanzar render completo, consultar progreso                        |

### Bridge Node.js (render-service)

Express API minima que expone el pipeline Remotion existente:

```
POST /api/validate          -> valida config.json contra Zod schema
POST /api/render-still      -> renderiza 1 frame de 1 escena -> PNG
POST /api/render            -> lanza render completo -> job_id
GET  /api/render/:id/status -> estado del render (progress %, ETA)
GET  /api/render/:id/output -> URL del MP4
GET  /api/audio/library     -> lista de tracks disponibles
```

No se modifica el codigo de Remotion ni los scripts existentes. El bridge importa las mismas funciones y las expone como endpoints.

## Frontend

### Chat con 3 elementos extra

1. **Tarjetas de checkpoint**: propuesta renderizada con formato visual + botones aprobar/pedir cambios
2. **Barra de progreso**: durante pasos largos (render, audio), eventos de progreso inline
3. **Media embebida**: previews (imagenes) y resultado final (video MP4) en el chat

### Componentes React

```
App.tsx
components/
  ChatWindow.tsx
  MessageBubble.tsx
  CheckpointCard.tsx    -- escaleta, preview, sonido
  ProgressBar.tsx
  MediaEmbed.tsx        -- imagenes, video player
hooks/
  useChat.ts            -- SSE streaming + estado
api.ts                  -- cliente HTTP (4 endpoints)
```

### Comunicacion

SSE (Server-Sent Events) para streaming de respuestas y progreso. Mas simple que WebSocket y suficiente para este caso.

## Endpoints del orquestador (FastAPI)

```
POST /api/chat              -> nuevo mensaje (inicia o continua thread)
POST /api/chat/resume       -> respuesta a un checkpoint (aprobar/feedback)
GET  /api/chat/:threadId    -> historial de un thread (para reconectar)
GET  /api/jobs/:jobId       -> estado de un render job
```

## Migracion de skills a prompts

### Que se migra

| Skill actual                | Destino                                           | Que se aprovecha                                                     |
| --------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| remotion-tutorial-generator | `prompts/researcher.md` + `prompts/copywriter.md` | Estrategia de research, estructura de escaleta, criterios de calidad |
| remotion-director           | `prompts/director.md`                             | Reglas de sincronia audio-visual, calculo de timing/beats            |
| sound-engineer              | `prompts/sound.md`                                | Criterios de seleccion de musica, reglas de ducking                  |
| remotion-short-ld           | `prompts/copywriter.md` (variante short)          | Estructura de short vertical                                         |
| remotion-best-practices     | No se migra                                       | Es referencia para desarrollo, no para el agente                     |

### Criterio de migracion

Las skills actuales mezclan 3 cosas:

1. **Criterio creativo** -> va al prompt
2. **Instrucciones de Claude Code** (AskUserQuestion, etc.) -> desaparece, lo sustituye `interrupt()`
3. **Conocimiento del codigo** (imports, paths) -> desaparece, el agente habla con render-service por HTTP

Los prompts resultantes son mas cortos y enfocados: solo criterio creativo + formato de output esperado.

## Estructura de repositorio

Monorepo con 4 paquetes:

```
remotion-platform/
|
+-- packages/
|   +-- agent/                    # Python -- orquestador DeepAgents
|   |   +-- pyproject.toml
|   |   +-- src/
|   |   |   +-- graph.py          # definicion del grafo LangGraph
|   |   |   +-- nodes/
|   |   |   |   +-- router.py
|   |   |   |   +-- researcher.py
|   |   |   |   +-- copywriter.py
|   |   |   |   +-- director.py
|   |   |   |   +-- preview.py
|   |   |   |   +-- sound.py
|   |   |   |   +-- render.py
|   |   |   +-- tools/
|   |   |   |   +-- web.py
|   |   |   |   +-- catalog.py
|   |   |   |   +-- render_bridge.py
|   |   |   |   +-- audio.py
|   |   |   +-- prompts/
|   |   |   |   +-- researcher.md
|   |   |   |   +-- copywriter.md
|   |   |   |   +-- director.md
|   |   |   |   +-- sound.md
|   |   |   +-- state.py
|   |   |   +-- api.py
|   |   +-- tests/
|   |
|   +-- render-service/           # Node.js -- bridge HTTP
|   |   +-- package.json
|   |   +-- src/
|   |   |   +-- server.ts
|   |   |   +-- routes/
|   |   |       +-- validate.ts
|   |   |       +-- render.ts
|   |   |       +-- still.ts
|   |   |       +-- audio.ts
|   |   +-- tsconfig.json
|   |
|   +-- web/                      # React -- frontend chat
|       +-- package.json
|       +-- src/
|       |   +-- App.tsx
|       |   +-- components/
|       |   |   +-- ChatWindow.tsx
|       |   |   +-- MessageBubble.tsx
|       |   |   +-- CheckpointCard.tsx
|       |   |   +-- ProgressBar.tsx
|       |   |   +-- MediaEmbed.tsx
|       |   +-- hooks/
|       |   |   +-- useChat.ts
|       |   +-- api.ts
|       +-- tsconfig.json
|
+-- remotion/                     # Pipeline existente (movido aqui)
|   +-- src/
|   +-- scripts/
|   +-- tutorials/
|   +-- public/
|   +-- package.json
|
+-- README.md
```

## Deployment MVP

Todo en una sola maquina:

- **Agent**: FastAPI en :8000
- **Render service**: Express en :3100
- **Web**: Vite dev server en :5173
- **Estado**: SQLite o JSON en disco (LangGraph checkpointer)
- **Chromium**: instalado via `npx remotion browser ensure`

### Variables de entorno

```env
# Agent
LLM_MODEL=google_genai:gemini-2.5-pro
RENDER_SERVICE_URL=http://localhost:3100
LANGSMITH_API_KEY=...                        # opcional

# Render service
ELEVENLABS_API_KEY=...
GOOGLE_GENAI_API_KEY=...
```

## Vertical slice MVP

Primera iteracion minima end-to-end:

1. **Frontend**: chat con un solo tipo de checkpoint card (escaleta)
2. **Agente**: router -> copywriter -> checkpoint escaleta -> render_dispatcher (sin director, sin preview, sin sound)
3. **Render service**: solo `/api/validate` + `/api/render` + `/api/render/:id/status`
4. El agente genera un config.json basico, lo valida, lo manda a renderizar

Demuestra el flujo completo con el minimo esfuerzo. Despues se anaden nodos uno a uno.

## Fuera de scope (MVP)

- Autenticacion de usuarios (red corporativa, acceso directo)
- Multi-tenancy
- Dashboard de historial de videos
- Notificaciones (email/Slack cuando el render termina)
- CI/CD del monorepo

Se pueden anadir despues del vertical slice si hay traccion.

## Riesgos y mitigaciones

| Riesgo                                                       | Mitigacion                                                                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| DeepAgents es muy nuevo, puede tener bugs o cambios breaking | LangGraph debajo es estable. Si DeepAgents falla, se puede bajar a LangGraph puro sin reescribir el grafo                         |
| Render lento (CPU-intensivo) bloquea la maquina              | El render es asincrono (job_id). En el futuro se puede mover a otra maquina o usar Remotion Lambda                                |
| Calidad de prompts con LLM diferente a Claude                | Los prompts son archivos .md editables. Se iteran rapidamente sin tocar codigo. Empezar con vertical slice permite validar pronto |
| Marketing genera configs invalidos via el agente             | Validacion Zod obligatoria antes de render. El agente llama a `/api/validate` antes de pasar al render                            |
| Dos runtimes (Python + Node.js) complican el deploy          | Para el MVP todo corre en una maquina. El bridge HTTP mantiene los runtimes desacoplados                                          |
