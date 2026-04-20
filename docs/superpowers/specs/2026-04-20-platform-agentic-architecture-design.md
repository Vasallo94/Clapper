# Platform Agentic Architecture — Design Spec

**Fecha**: 2026-04-20
**Autor**: Enrique Vasallo + Claude
**Estado**: Aprobado
**Supersede**: `2026-04-17-remotion-platform-design.md` (vertical slice MVP — ya implementado)

## Objetivo

Refactorizar la plataforma Remotion en dos ejes:

1. **Remotion shared code** — eliminar duplicación entre composiciones, crear catálogo de escenas consultable por agentes
2. **Pipeline multi-agente** — reemplazar el agente monolítico actual por un orquestador con 5 subagentes especializados (DeepAgents SubAgent + CompiledSubAgent)

## Contexto

### Estado actual (vertical slice MVP, funcional)

```
packages/agent/      → Python FastAPI + DeepAgents, 1 agente copywriter, 3 tools
packages/render-service/ → Express bridge, valida configs (Zod), renderiza via subprocess
packages/web/        → React chat con checkpoint cards
```

El E2E funciona: chat → escaleta → aprobación → render → MP4. Pero:

- El agente es un blob monolítico que solo conoce 9 escenas básicas
- No hay researcher, director, sound engineer ni scene creator
- ProductShort importa código directamente de ClaudeCodeTutorial (acoplamiento)
- No hay streaming SSE — el frontend bloquea hasta que el agente termina
- No hay persistencia de memorias entre sesiones

### Decisiones ya tomadas

| Decisión               | Elección                                                                 |
| ---------------------- | ------------------------------------------------------------------------ |
| Framework de agentes   | DeepAgents (SubAgent + CompiledSubAgent)                                 |
| Backend default        | LocalShellBackend con inherit_env=True                                   |
| Persistencia           | CompositeBackend: LocalShell (efímero) + StoreBackend (memorias, skills) |
| Skills system          | Progressive disclosure para scene catalog y best practices               |
| Checkpoints humanos    | interrupt() en tools, burbujean desde subagentes                         |
| Streaming              | SSE (Server-Sent Events) via astream()                                   |
| LLM                    | Gemini 3.1 Pro (default) / 3.1 Flash (researcher) via Vertex AI          |
| Enfoque arquitectónico | Híbrido: SubAgents dict (mayoría) + CompiledSubAgent (Scene Creator)     |

---

## Eje 1: Refactor Remotion — Código compartido

### 1.1 Extraer shared code a `src/shared/`

**Problema:** ProductShort importa themes, PhoneMascot y MascotWatermark desde `src/compositions/ClaudeCodeTutorial/`. Funciona pero crea acoplamiento — una composición depende de la otra.

**Solución:**

```
src/shared/
├── themes/
│   ├── ThemeContext.ts          ← desde ClaudeCodeTutorial/themes.ts
│   ├── tokens.ts                ← ThemeTokens type + theme definitions
│   └── useThemeTokens.ts        ← hook
├── components/
│   ├── PhoneMascot.tsx
│   ├── MascotWatermark.tsx
│   ├── LogoWatermark.tsx
│   └── PixelLogo.tsx
├── hooks/
│   └── useSlideIn.ts
└── subtitles/
    └── KaraokeSubtitles.tsx
```

Ambas composiciones importan desde `src/shared/`. Los imports internos de cada composición solo contienen lo específico (scenes, schema, registry).

### 1.2 CompositionShell — eliminar boilerplate duplicado

**Problema:** ClaudeCodeTutorial.tsx y ProductShort.tsx repiten ~80 líneas idénticas: loop de sceneInfos (precompute timing/beats/audio delay), sceneAudioInfos, render de ThemeContext.Provider → AbsoluteFill → music bed → Series → Audio + scene component.

**Solución:** `src/shared/CompositionShell.tsx`:

```tsx
<CompositionShell config={config} sceneRenderers={renderers}>
  {/* Maneja: ThemeContext, precompute, Series, audio mixing */}
</CompositionShell>
```

Cada composición se reduce a:

1. Definir su mapa de `sceneRenderers` (type → component)
2. Pasar su config
3. CompositionShell maneja todo el boilerplate

### 1.3 Scene catalog automático

**Problema:** `customSceneRegistry.ts` tiene 26 componentes como Record estático. Los agentes no saben qué escenas existen ni qué props acepta cada una.

**Solución:** Script `scripts/generate-scene-catalog.ts` que:

1. Lee `customSceneRegistry.ts` para obtener componentIds
2. Extrae props del schema Zod (CustomSceneSchema union en schema.ts)
3. Genera `src/shared/scene-catalog.json`:

```json
{
  "scenes": [
    {
      "componentId": "block-diagram",
      "description": "Visual block diagram with labeled boxes and connections",
      "props": {
        "title": { "type": "string", "required": true },
        "blocks": { "type": "array" },
        "connections": { "type": "array" }
      },
      "example": {}
    }
  ],
  "builtinScenes": ["intro", "terminal", "callout", "outro"]
}
```

Este JSON se carga como skill del pipeline de agentes (progressive disclosure).

### 1.4 Schemas Zod centralizados

**Problema:** Schemas compartidos (TimingSchema, BeatSchema, BriefSchema, VoiceoverConfigSchema, SoundDesignSchema) viven en `src/utils/direction.ts` — mezclados con helpers.

**Solución:**

```
src/shared/schemas/
├── direction.ts    ← TimingSchema, BeatSchema, BriefSchema, DirectionSceneFieldsSchema
├── audio.ts        ← VoiceoverConfigSchema, SoundDesignSchema
└── index.ts        ← re-exports
```

Schemas específicos de cada composición (TutorialConfigSchema, ProductShortConfigSchema) se quedan en su schema.ts pero importan los shared.

---

## Eje 2: Pipeline multi-agente

### 2.1 Estructura del paquete agent

```
packages/agent/
├── src/
│   ├── api.py                    ← FastAPI (se extiende con SSE)
│   ├── orchestrator.py           ← Agente principal con SubAgentMiddleware
│   ├── subagents/
│   │   ├── researcher.py         ← SubAgent dict
│   │   ├── copywriter.py         ← SubAgent dict + interrupt(escaleta)
│   │   ├── scene_creator/
│   │   │   ├── graph.py          ← CompiledSubAgent (generate → validate loop)
│   │   │   ├── nodes.py          ← Nodos del grafo
│   │   │   └── tools.py          ← write_scene, register_scene, validate_bundle
│   │   ├── director.py           ← SubAgent dict
│   │   └── sound_engineer.py     ← SubAgent dict + interrupt(carta sonido)
│   ├── tools/
│   │   ├── render.py             ← submit_render, check_render_status
│   │   ├── research.py           ← web_search, web_fetch, scrape_product
│   │   ├── filesystem.py         ← read_file, write_file, list_scenes
│   │   └── catalog.py            ← query_scene_catalog, get_scene_props
│   ├── skills/
│   │   ├── scene_catalog.md      ← Scene catalog (progressive disclosure)
│   │   ├── best_practices.md     ← Remotion rules
│   │   └── brand_guidelines.md   ← LD brand reference
│   └── prompts/
│       ├── orchestrator.md
│       ├── researcher.md
│       ├── copywriter.md
│       ├── scene_creator.md
│       ├── director.md
│       └── sound_engineer.md
```

### 2.2 Orquestador

Agente principal con `SubAgentMiddleware`. Decide el workflow según el input del usuario:

- "Genera un short del seguro de mascotas" → researcher → copywriter → [scene_creator si faltan escenas] → director → sound_engineer → render
- "Genera un tutorial de Claude Code" → researcher → copywriter → [scene_creator si hay custom scenes nuevas] → director → sound_engineer → render
- "Ajusta el timing del vídeo anterior" → director → re-render

El orquestador actúa como **hub**: llama a un subagente via `task()`, recibe su resultado como ToolMessage, inspecciona el resultado, y decide a quién pasárselo a continuación con contexto adicional. Los subagentes nunca se hablan entre sí directamente.

Render es una tool directa del orquestador (submit_render, check_render_status) — no requiere razonamiento LLM, es un POST HTTP + polling.

El config.json fluye como texto en mensajes entre agentes — no hay escritura a disco intermedia hasta el render final.

### 2.3 Subagentes

#### Researcher — SubAgent dict

```python
{
    "name": "researcher",
    "description": "Busca información de producto, competencia y contexto para el vídeo",
    "system_prompt": load_prompt("researcher"),
    "tools": [web_search, web_fetch, scrape_product],
    "model": "gemini-3.1-flash"
}
```

**Responsabilidad:** Recopilar datos factuales. Para shorts: precios, beneficios, coberturas, ofertas de lineadirecta.com. Para tutoriales: documentación oficial de la feature, ejemplos de uso.

**Tools:**

- `web_search(query)` → resultados de búsqueda
- `web_fetch(url)` → contenido de una URL
- `scrape_product(product_slug)` → scraping especializado de lineadirecta.com

**Modelo:** gemini-3.1-flash — tarea de recopilación, no requiere razonamiento complejo.

**Output:** Texto estructurado con datos del producto.

#### Copywriter — SubAgent dict + interrupt

```python
{
    "name": "copywriter",
    "description": "Genera escaleta y config.json del vídeo con checkpoint humano",
    "system_prompt": load_prompt("copywriter"),
    "tools": [present_escaleta, query_scene_catalog],
    "skills": ["skills/scene_catalog.md", "skills/brand_guidelines.md"]
}
```

**Responsabilidad:** Recibe datos del researcher + instrucción original. Diseña editorial brief, elige escenas del catálogo, escribe copy, produce config.json completo.

**Checkpoint:** `present_escaleta(scenes, brief)` → interrupt burbujea al frontend → usuario aprueba o pide cambios → loop sin límite de rondas.

**Tools:**

- `present_escaleta(scenes, brief)` → interrupt (existente)
- `query_scene_catalog(query?)` → catálogo de escenas con progressive disclosure

**Skills (lazy load):**

- `scene_catalog.md` — 26+ escenas con props y ejemplos
- `brand_guidelines.md` — paleta LD, tono "Tipo Directo", mascota

**Output:** Config JSON completo con scenes, brief, voiceover config.

#### Scene Creator — CompiledSubAgent

Único subagente con control flow complejo. Se activa solo cuando el config referencia un componentId que no existe en el catálogo.

```
generate .tsx → lint (eslint) → register in registry → validate bundle
     ▲              │ fail                                    │ fail
     └──────────────┴─────────── retry con error ◄────────────┘
```

**Nodos:**

1. **generate** — LLM genera el .tsx. Recibe: componentId, props esperadas, scene-catalog como referencia, best-practices de Remotion.
2. **lint** — Determinista. `npx eslint` sobre el fichero. Si falla → retry con error.
3. **register** — Determinista. Añade import + entrada a `customSceneRegistry.ts`.
4. **validate** — Determinista. `npx remotion bundle` (subset) para verificar compilación. Si falla → retry con error del compilador.

**Tools (nodo generate):**

- `write_scene(component_id, code)` → escribe .tsx en scenes/custom/
- `read_scene(component_id)` → lee componente existente como referencia

**Skills:** best_practices.md, scene_catalog.md

**Retry:** Máximo 3 intentos. Si falla, devuelve error al orquestador que puede usar escena existente como fallback.

**Output:** componentId registrado y listo para bundle, o error descriptivo.

#### Director — SubAgent dict

```python
{
    "name": "director",
    "description": "Pule timing, beats narrativos y sincronización audio/visual del config",
    "system_prompt": load_prompt("director"),
    "tools": []
}
```

**Responsabilidad:** Aplica dirección editorial. Añade/ajusta timing y beats por escena. Verifica reglas obligatorias:

- No empezar con voz+movimiento en el mismo frame
- leadInMs si hay voiceover
- tailHoldMs para CTA
- transitionMs entre escenas
- Pausa narrativa (800ms+ silence) cada 15-20s
- Gaps entre beats: 200-400ms

**Sin tools.** Trabaja puramente sobre el JSON — recibe config, devuelve config modificado + warnings.

**Sin checkpoint humano.** Pase automático.

**Output:** Config JSON con timing/beats + lista de 3-6 warnings.

#### Sound Engineer — SubAgent dict + interrupt

```python
{
    "name": "sound_engineer",
    "description": "Diseña música de fondo y SFX, genera archivos de audio",
    "system_prompt": load_prompt("sound_engineer"),
    "tools": [present_sound_chart, generate_audio, list_audio_library],
}
```

**Responsabilidad:** Analiza config (brief tone, scene types, beats emphasis, duración). Propone music bed + carta SFX.

**Checkpoint:** `present_sound_chart(music_bed, sfx_entries)` → interrupt → usuario aprueba o ajusta.

**Tools:**

- `present_sound_chart(music_bed, sfx_entries)` → interrupt (mismo patrón que escaleta)
- `generate_audio(config_path)` → ejecuta `npx tsx scripts/generate-sound-design.ts`
- `list_audio_library()` → lista loops en `public/audio/library/`

**Output:** Config JSON con soundDesign section + ficheros de audio generados.

### 2.4 Tabla resumen de subagentes

| Subagente      | Tipo             | Modelo           | Tools                                                   | Interrupt    | Skills                        |
| -------------- | ---------------- | ---------------- | ------------------------------------------------------- | ------------ | ----------------------------- |
| Researcher     | SubAgent dict    | gemini-3.1-flash | web_search, web_fetch, scrape_product                   | No           | —                             |
| Copywriter     | SubAgent dict    | gemini-3.1-pro   | present_escaleta, query_scene_catalog                   | Escaleta     | scene_catalog, brand          |
| Scene Creator  | CompiledSubAgent | gemini-3.1-pro   | write_scene, read_scene                                 | No           | best_practices, scene_catalog |
| Director       | SubAgent dict    | gemini-3.1-pro   | —                                                       | No           | —                             |
| Sound Engineer | SubAgent dict    | gemini-3.1-pro   | present_sound_chart, generate_audio, list_audio_library | Carta sonido | —                             |

---

## Infraestructura

### 3.1 CompositeBackend

```python
backend = CompositeBackend(
    default=LocalShellBackend(
        inherit_env=True,
        timeout=300,
        max_output_bytes=200_000
    ),
    routes={
        "/memories/": StoreBackend(
            namespace=lambda rt: (rt.server_info.user.identity,)
        ),
        "/skills/": StoreBackend(
            namespace=lambda rt: (rt.server_info.assistant_id,)
        ),
    }
)
```

**Routing:**

- **Default (LocalShellBackend):** Trabajo efímero — ficheros temporales, ejecución de comandos, logs. Se limpia entre sesiones.
- **`/memories/`:** Per-user. Preferencias aprendidas entre threads.
- **`/skills/`:** Per-assistant (compartido entre usuarios). Scene catalog, best practices, brand guidelines.

### 3.2 Checkpointer

- **Desarrollo:** `MemorySaver()` (in-memory). Suficiente para MVP.
- **Producción (futuro):** `AsyncPostgresSaver`. Threads sobreviven reinicios.

### 3.3 Streaming SSE

Nuevo endpoint que reemplaza el invoke bloqueante actual:

```python
@app.get("/api/chat/{thread_id}/stream")
async def stream(thread_id: str):
    async def event_generator():
        async for event in agent.astream(
            input, config,
            stream_mode=["updates", "custom"]
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

**Tipos de evento:**

- `agent_status` — qué subagente está activo
- `escaleta_checkpoint` / `sound_chart_checkpoint` — interrupt pendiente
- `scene_creator_step` — paso del loop (generate/lint/register/validate) + intento N/3
- `render_progress` — porcentaje de render
- `message` — texto del agente
- `error` — error con contexto del subagente que falló

### 3.4 Endpoints API

| Método | Path                           | Propósito                                                                                                   |
| ------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| POST   | `/api/chat`                    | Iniciar conversación — envía primer mensaje, devuelve thread_id. El cliente abre SSE inmediatamente después |
| GET    | `/api/chat/{thread_id}/stream` | SSE con progreso en tiempo real. Se abre tras POST /api/chat y se mantiene abierto durante todo el pipeline |
| POST   | `/api/chat/{thread_id}/resume` | Reanudar tras checkpoint                                                                                    |
| GET    | `/api/chat/{thread_id}`        | Historial de mensajes                                                                                       |

### 3.5 Resiliencia

- **Model fallback:** `ModelFallbackMiddleware` — si gemini-3.1-pro falla, fallback a gemini-3.1-flash
- **Tool retries:** Backoff exponencial para llamadas HTTP (render service, web search)
- **SummarizationMiddleware:** Auto-resumir cuando contexto > 4000 tokens o > 20 mensajes

---

## Frontend

### 4.1 Hook principal: useAgentStream

```typescript
function useAgentStream(threadId: string | null) {
  // Returns:
  //   events: StreamEvent[]
  //   activeAgent: string | null
  //   checkpoint: CheckpointData | null
  //   renderProgress: number
  //   status: "idle" | "streaming" | "checkpoint" | "done" | "error"
}
```

Abre EventSource al endpoint SSE, parsea eventos, actualiza estado local.

### 4.2 Componentes por tipo de evento

| Evento SSE               | Componente             | Qué muestra                                    |
| ------------------------ | ---------------------- | ---------------------------------------------- |
| `agent_status`           | `<SubagentBadge>`      | Pill con nombre del subagente + spinner        |
| `escaleta_checkpoint`    | `<EscaletaCard>`       | Brief + escenas, botones Aprobar/Pedir cambios |
| `sound_chart_checkpoint` | `<SoundChartCard>`     | Tabla music bed + SFX, botones Aprobar/Ajustar |
| `render_progress`        | `<RenderProgress>`     | Barra de progreso                              |
| `scene_creator_step`     | `<SceneCreatorStatus>` | Paso actual + intento                          |
| `message`                | `<MessageBubble>`      | Texto del agente                               |
| `error`                  | `<ErrorBanner>`        | Error con contexto                             |

### 4.3 Estado del chat

```typescript
type ChatState = {
  threadId: string | null
  messages: Message[]
  activeAgent: string | null
  checkpoint: CheckpointData | null
  renderProgress: number
  status: "idle" | "streaming" | "checkpoint" | "done" | "error"
}
```

Los eventos internos de subagentes (tool calls, razonamiento) no se muestran al usuario. Solo: mensajes finales del orquestador, badges de subagente activo, checkpoints y progreso de render.

---

## Fuera de scope

- Autenticación de usuarios
- Multi-tenancy
- Dashboard de historial de vídeos
- Preview visual (renderStill por escena) — futuro checkpoint 2
- CI/CD del monorepo
- Migración a PostgreSQL checkpointer
- AsyncSubAgent para renders paralelos

## Riesgos y mitigaciones

| Riesgo                                            | Mitigación                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| DeepAgents breaking changes                       | LangGraph debajo es estable. SubAgent dict es la API más simple y menos propensa a cambios                |
| Scene Creator genera código que no compila        | Loop determinista con 3 retries. Fallback a escena existente. ESLint + bundle validation antes de aceptar |
| Configs JSON grandes desbordan contexto LLM       | SummarizationMiddleware. Director y Sound Engineer reciben solo el config, no todo el historial           |
| Interrupts de subagentes no burbujean             | Verificar con test E2E que interrupt en copywriter/sound_engineer llega al frontend                       |
| Render lento bloquea la máquina                   | Render asíncrono (job_id + polling). Futuro: Remotion Lambda o máquina dedicada                           |
| Modelo gemini-3.1-pro no disponible temporalmente | ModelFallbackMiddleware a gemini-3.1-flash                                                                |
