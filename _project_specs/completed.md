# Specs completadas

Specs movidas aquí tras implementación exitosa.

---

## 2026-05-12 — Linea Directa Brand Lockup

### Objective

Mejorar la presencia de marca de Linea Directa en las presentaciones usando assets oficiales animados por composicion en Remotion.

### Scope

- Incorporar el SVG oficial como asset publico para el lockup completo.
- Incorporar un recorte oficial del telefono para apariciones pequenas como mascota/watermark.
- Crear `LineaDirectaBrandLockup` con reveal, spring y glint frame-by-frame sobre el asset oficial.
- Usar el lockup completo en la intro de `ClaudeCodeTutorial` cuando el tema muestra mascota.
- Mejorar contraste del simbolo en el hero vertical de `ProductShort`.

### Acceptance Criteria

1. Existe un componente reutilizable para el lockup de marca Linea Directa.
2. El lockup renderiza el asset oficial con telefono, wordmark y subrayado rojo.
3. La intro de `ClaudeCodeTutorial` usa el lockup cuando el tema muestra mascota.
4. Las animaciones usan `useCurrentFrame()` con `spring()`/`interpolate()`.
5. El cambio pasa `npm run lint`.

### Test Cases

1. `npm run lint` — zero errors, existing warnings only.
2. `npm run test:visual` — 2 tests passing.
3. `remotion still` frame 45 for `ClaudeCodeTutorial` — lockup visible, no duplicated brand label.
4. `remotion still` frame 45 for `ProductShort` — phone symbol remains legible on red background.

---

## 2026-05-11 — Normalización de streaming y UI de modos

### Objective

Mejorar el frontend del agente para que soporte los nuevos modos del orquestador y elimine duplicados en mensajes, cards de agentes, tools y artifacts durante la ejecución.

### Scope

- Normalizar eventos de streaming a entidades estables con dedupe por ids/signatures.
- Añadir cards para checkpoints de selección de target, plan de revisión y plan de variante.
- Refactorizar `useAgentStream` para usar refs y useEffect (sin side-effects en setState).
- Añadir `/api/configs` endpoint al render-service.
- Guardar `app.listen()` con entrypoint guard para tests.

### Acceptance Criteria

1. El procesamiento de streaming no ejecuta efectos secundarios dentro de updaters de React.
2. Las tools se deduplican por `tool_call_id` cuando existe y por signature estable como fallback.
3. Los artifacts se deduplican por source/signature estable y no por ids aleatorios.
4. `ACTIVE_VIDEO_TARGET` se añade, parsea y oculta mediante helpers centralizados.
5. La UI activa `streamSubgraphs` en las llamadas de stream para recibir namespaces cuando el backend las emita.
6. Existen cards dedicadas para `target_selection_checkpoint`, `revision_plan_checkpoint` y `variant_plan_checkpoint`.
7. La UI muestra una card/resumen útil para `route_intent` (como artifact compacto en AgentArtifactCard).
8. Hay tests unitarios para helpers de metadata y dedupe de stream.

### Test Cases

1. `npx vitest run packages/web/src/lib/` — 6 tests passing.
2. `npx tsx --test packages/render-service/test/server.test.ts` — 5 tests passing (includes `/api/configs`).
3. `npx tsc --noEmit -p packages/web/tsconfig.json` — zero errors.

---

## 2026-05-11 — Rediseño del orquestador por modos

### Objective

Separar la decisión de intención del pipeline creativo completo para que el agente pueda operar sobre vídeos existentes, renders, auditorías, variantes, recuperación de errores y preguntas sin reiniciar siempre el flujo completo.

### Scope

- Añadir router determinista para `new_video`, `revise_existing`, `render_only`, `recover_failed_render`, `audit_only`, `variant`, `asset_regeneration` y `question`.
- Definir contratos de modo con target requerido, agentes permitidos/prohibidos, permisos de escritura/render y checkpoints.
- Añadir tools para listar, cargar, preparar y guardar configs existentes.
- Añadir checkpoints para plan de revisión, variante y selección de target.
- Actualizar prompts de orquestador/subagentes para respetar contratos de modo.
- Persistir artifacts seleccionables en la UI y enviar target activo al backend.
- Documentar modos futuros.

### Acceptance Criteria

1. El router clasifica los 8 modos base con decisión estructurada.
2. Los contratos bloquean escritura/render/agentes prohibidos por modo.
3. Los modos que requieren target devuelven `missing_target` cuando la UI no lo aporta.
4. La UI guarda artifacts renderizados con `configPath`, `configId`, `jobId`, `composition` y `title`.
5. La UI envía `ACTIVE_VIDEO_TARGET` en el mensaje al backend cuando hay target activo.
6. Los prompts obligan al orquestador a aplicar `route_intent` antes de dispatch.
7. Los modos futuros quedan en roadmap.

### Test Cases

1. `uv run pytest tests/test_modes.py tests/test_tools_configs.py`
2. `uv run pytest tests/test_orchestrator.py`
3. `npm run build --workspace packages/web`

---

## 2026-05-08 — Scene Catalog Templates and Narrative Metadata

### Objective

Elevar el catálogo de escenas de una lista técnica de componentes a una herramienta de dirección narrativa para agentes. El copywriter ahora puede elegir una plantilla de vídeo y escenas por rol narrativo antes de generar la escaleta.

### Scope

- Añadir metadata narrativa a escenas built-in y custom.
- Añadir plantillas reutilizables para tutoriales y shorts.
- Hacer que `query_scene_catalog` consulte escenas y plantillas.
- Actualizar skills/prompts para exigir selección de plantilla.
- Añadir `brief.templateId` y `brief.narrativeArc` al schema compartido.

### Acceptance Criteria

1. `scene-catalog.json` incluye metadata narrativa por escena.
2. `scene-catalog.json` incluye plantillas de vídeo reutilizables.
3. `query_scene_catalog` permite consultar escenas y plantillas por texto.
4. La skill `scene-catalog` documenta cómo elegir plantilla antes de escribir escenas.
5. El prompt del copywriter obliga a seleccionar una plantilla y justificar desviaciones.
6. La auditoría editorial recomienda añadir `brief.templateId` cuando falte.
7. Hay tests de la tool de catálogo y de la auditoría de template.

### Test Cases

1. `query_scene_catalog("template")` devuelve plantillas.
2. `query_scene_catalog("code-walkthrough")` devuelve la plantilla concreta.
3. `query_scene_catalog("terminal")` devuelve metadata narrativa de la escena.
4. Config sin `brief.templateId` devuelve recomendación editorial.
5. `npm run generate:catalog` genera un JSON válido.

---

## 2026-05-08 — DeepAgent Content Quality Upgrade

### Objective

Mejorar el pipeline DeepAgents para que genere mejores vídeos automáticamente, alineando el flujo con las recomendaciones oficiales de Remotion para agentes: skills reutilizables, salida estructurada validada contra schemas, y compilación/validación automática antes de renderizar.

### Scope

- Registrar `scene_creator` en el orquestador real.
- Ejecutar la validación Zod de Remotion desde `validate_config` cuando el script local está disponible.
- Añadir `audit_content_quality` para detectar problemas editoriales de hook, densidad, CTA, beats, timing y voiceover.
- Actualizar prompts de orquestador, copywriter, director, validator y scene creator.
- Normalizar path handling en herramientas de audio/voz para tests y runtime local/Docker.

### Acceptance Criteria

1. El orquestador incluye el subagente `scene_creator` que ya existe.
2. `validate_config` ejecuta la validación Zod de Remotion y conserva los checks de assets.
3. La auditoría editorial devuelve errores, warnings y recomendaciones accionables.
4. Los prompts obligan a usar validación de schema + calidad antes de avanzar.
5. Hay tests unitarios para validación Zod, auditoría editorial y conexión del `scene_creator`.

### Test Cases

1. `uv run pytest tests` en `packages/agent`.
2. Config con schema inválido devuelve errores de schema.
3. Config con texto denso devuelve warnings editoriales.
4. Orquestador mantiene `create_scene_creator()` en el flujo.

---

## 2026-03-28 — Claude Code Memory V2

### Objective

Crear una V2 del tutorial `claude-code-memory` con mejor ritmo, mayor claridad visual y una propuesta más adecuada para consumo rápido en LinkedIn.

### Scope

- Reescribir la narrativa del vídeo para reducir su duración total.
- Mejorar la jerarquía visual de las escenas más densas.
- Mantener la identidad visual personal del tutorial mientras se mejora el ritmo y la claridad.
- Mantener el tutorial dentro del sistema actual de composiciones y escenas reutilizables.

### Acceptance Criteria

1. La duración total del tutorial queda por debajo de 100 segundos.
2. El hook inicial comunica el beneficio principal en menos de 6 segundos.
3. La escena de terminal y las escenas de memoria muestran menos texto por pantalla que la versión anterior.
4. El bloque de los tres sistemas muestra relaciones visuales entre conceptos.
5. Auto Dream deja de ser el bloque dominante del vídeo y pasa a ser una explicación breve y clara.
6. El cierre tiene una CTA más clara que la versión anterior.
7. El config sigue validando con el esquema actual y la composición renderiza sin cambios estructurales fuera del sistema existente.

### Test Cases

1. Ejecutar `npm run lint` sin errores.
2. Renderizar fotogramas representativos del tutorial y comprobar:
   - legibilidad del hook
   - legibilidad de terminal
   - claridad del file explorer
   - conexión visual en el diagrama de 3 bloques
   - cierre con CTA clara
3. Verificar que el `config.json` actualizado reduce la duración total esperada.

---

## 2026-03-28 — Pixel Logo Map

### Objective

Convertir un logo raster a un mapa de píxeles reutilizable para Remotion, con una estética más cercana a pixel art tradicional que a un simple pixelado automático.

### Scope

- Incorporar el logo fuente al repositorio como asset reutilizable.
- Generar un mapa de píxeles serializable y editable desde TypeScript.
- Crear un componente de Remotion que pinte el sprite y soporte animaciones básicas.
- Añadir una composición de preview para validar el resultado visual.

### Acceptance Criteria

1. Existe un asset fuente accesible desde el proyecto.
2. Existe un mapa de píxeles tipado exportado desde `src`.
3. El mapa usa una paleta cerrada con transparencia y varios niveles de gris.
4. Existe un componente reutilizable que renderiza el logo como pixel art.
5. Existe una composición de preview que permite inspeccionar el sprite en Remotion Studio.
6. `npm run lint` pasa sin errores.

### Test Cases

1. Ejecutar `npm run lint`.
2. Ejecutar el script generador y verificar que produce el mapa y un preview SVG.
3. Abrir la composición de preview y comprobar que:
   - el logo mantiene la silueta principal
   - se lee como pixel art y no como imagen degradada
   - las animaciones básicas funcionan sin artefactos

---

## 2026-03-28 — Pixel Logo Video Integration

### Objective

Integrar el logo en pixel art dentro del tutorial `claude-code-memory` como una primera prueba visual dentro del vídeo final.

### Scope

- Extender el esquema del tutorial para permitir un logo pixel opcional en escenas compatibles.
- Integrar el logo en la escena de intro con animación sutil.
- Activar la integración en `tutorials/claude-code-memory/config.json`.

### Acceptance Criteria

1. La escena de intro puede renderizar opcionalmente el logo pixel art.
2. La configuración del tutorial de memoria activa esa opción.
3. El logo aparece integrado sin tapar título ni subtítulo.
4. `npm run lint` pasa sin errores.

### Test Cases

1. Ejecutar `npm run lint`.
2. Renderizar un still del tutorial y comprobar que el intro muestra:
   - logo visible
   - composición equilibrada
   - texto legible

---

## 2026-03-28 — Editorial Direction Sync

### Objective

Añadir una capa de dirección editorial y sincronía entre guion, audio y animación para que los vídeos tengan mejor ritmo, intención narrativa y respiración visual.

### Scope

- Definir un modelo compartido de `brief`, `timing` y `beats` dentro del `config.json`.
- Mantener compatibilidad hacia atrás con configs existentes.
- Actualizar runtime para respetar delays de audio y duraciones dirigidas.
- Introducir utilidades comunes para trabajar con milisegundos, beats y offsets.
- Aplicar la primera adopción en `claude-code-memory`.
- Crear una nueva skill `remotion-director` y actualizar las skills generadoras existentes.

### Acceptance Criteria

1. `ClaudeCodeTutorial` y `ProductShort` aceptan `brief`, `timing` y `beats` en schema.
2. `voiceover.scenes` acepta tanto string legacy como objeto con `text` y timing opcional.
3. El runtime calcula duración por escena usando lead-in, delay de audio y tail hold cuando existen.
4. El audio puede empezar más tarde que el frame 0 de la escena.
5. `claude-code-memory` usa el nuevo sistema en intro, outro y al menos una escena central.
6. Existe una skill `remotion-director` documentada y las skills generadoras la integran en su flujo.
7. Los configs antiguos siguen validando y renderizando.

### Test Cases

1. Ejecutar `npm run lint`.
2. Renderizar un still del intro de `claude-code-memory` y comprobar pausa inicial + logo + título antes de la voz.
3. Renderizar el vídeo completo `tutorials/claude-code-memory/output.mp4`.
4. Validar un still de `ProductShort` con timing compatible en runtime.
5. Verificar que un config legacy sin `brief`, `timing` ni `beats` sigue seleccionando composición sin error.

---

## 2026-03-28 — Terminal Pacing and ElevenLabs Controls

### Objective

Hacer que las escenas de terminal pierdan menos tiempo en typing lento y exponer controles útiles de ElevenLabs directamente en `config.json` para afinar la locución desde el propio guion.

### Scope

- Acelerar el streaming de Claude/Codex respecto al typing humano en `TerminalScene`.
- Mantener compatibilidad con escenas terminal existentes.
- Extender el schema de `voiceover` con opciones globales y overrides por escena para ElevenLabs.
- Hacer que el script de generación de voz use esos parámetros.
- Actualizar las skills para documentar el uso correcto de ElevenLabs y el nuevo pacing del terminal.

### Acceptance Criteria

1. Las líneas `claude` se renderizan más rápido que las líneas `command`.
2. Los configs existentes de terminal siguen funcionando sin cambios.
3. `voiceover.elevenlabs` acepta ajustes globales útiles y `voiceover.scenes[n].elevenlabs` acepta overrides.
4. El script de voiceover convierte esos ajustes al payload real de ElevenLabs.
5. Las skills y reglas internas reflejan el comportamiento nuevo.

### Test Cases

1. Ejecutar `npm run lint`.
2. Verificar que un config legacy con strings en `voiceover.scenes` sigue validando.
3. Verificar que un config con `provider: "elevenlabs"` y sin overrides sigue generando usando defaults razonables.

---

## 2026-05-08 — Deepagent Human Review Frontend

### Objective

Mejorar el frontal web de interacción con el deepagent para que el humano vea, durante el streaming y en los checkpoints, los artefactos creativos y técnicos relevantes: pensamiento operativo resumido, validaciones, escaleta, dirección, carta de sonido/audio y guion/voiceover.

### Scope

- Capturar outputs relevantes de herramientas como artefactos consultables del agente.
- Mostrar tarjetas legibles para validaciones y audio chart.
- Enriquecer las tarjetas existentes de escaleta, dirección y sonido.
- Soportar `audio_chart_checkpoint` además de `sound_chart_checkpoint`.
- Mantener fallback JSON para checkpoints desconocidos.

### Acceptance Criteria

1. El streaming muestra una línea de pensamiento/actividad del agente más legible que el texto parcial recortado.
2. Los outputs relevantes de herramientas se capturan como eventos consultables del agente.
3. Los checkpoints de escaleta, dirección, audio/carta de sonido y validación tienen tarjetas legibles para humano.
4. La escaleta muestra guion/voz si está disponible en la escena o en el checkpoint.
5. La carta de sonido soporta tanto `sound_chart_checkpoint` como `audio_chart_checkpoint`.
6. Los checkpoints desconocidos siguen teniendo fallback JSON aprobable.
7. La UI compila con TypeScript.

### Test Cases

1. `escaleta_checkpoint` con escenas muestra tabla de escenas, duración total y guion por escena si existe.
2. `direction_checkpoint` con warnings y beats muestra avisos y resumen de dirección por escena.
3. `audio_chart_checkpoint` con `voiceover` y `sound_design` muestra voz, música, SFX y guion de locución.
4. Resultado de `validate_config` con errors/warnings/recommendations aparece como artefacto de validación en el stream.
5. Tool output no JSON se muestra como artefacto de texto sin romper la UI.

---

## 2026-05-08 — Frontend Stream Polish And Duration Defaults

### Objective

Corregir los problemas visuales del frontal durante una ejecución real del deepagent y ajustar el criterio por defecto del copywriter para que los vídeos educativos no salgan como micro-piezas de 30-40 segundos cuando el usuario pide un tema amplio.

### Scope

- Ocultar burbujas de agente completado sin herramientas, artefactos ni texto útil.
- Deduplicar herramientas y artefactos equivalentes.
- Quitar el preview negro de la tarjeta de escaleta.
- Cambiar los templates tutoriales a 90-180 segundos.
- Añadir guardrail de auditoría para tutoriales por debajo de 90 segundos.

### Acceptance Criteria

1. No se muestran burbujas de agente completado sin herramientas, artefactos ni texto útil.
2. Las herramientas repetidas no generan ruido visual innecesario.
3. Los artefactos de validación duplicados se deduplican antes de pintarse.
4. La tarjeta de escaleta no muestra un player negro cuando la propuesta todavía no es un config renderizable completo.
5. El copywriter usa 90-180 segundos como duración educativa por defecto si el usuario no pide explícitamente un short.
6. La auditoría editorial avisa cuando un tutorial educativo queda por debajo de 90 segundos.
7. La UI compila con TypeScript.

### Test Cases

1. Stream con subagente sin contenido útil no muestra bubble vacía.
2. Dos outputs iguales de `validate_config` / `audit_content_quality` muestran un solo artefacto equivalente.
3. Escaleta con escenas terminal/custom parciales no muestra rectángulo negro de preview.
4. Prompt “vídeo educativo sobre Claude Code” hace que el agente reciba instrucción explícita de generar 90-180 segundos por defecto.
