# Normalización de streaming y UI de modos

## Descripción

Mejorar el frontend del agente para que soporte los nuevos modos del orquestador y elimine duplicados en mensajes, cards de agentes, tools y artifacts durante la ejecución.

La UI debe dejar de renderizar directamente eventos crudos de LangGraph/DeepAgents. En su lugar, normalizará eventos de streaming a entidades estables (`AgentRun`, `ToolRun`, `CheckpointArtifact`, `VideoArtifact`) con dedupe por ids/signatures. También añadirá cards específicas para los checkpoints nuevos de selección de target, plan de revisión y plan de variante.

## Criterios de aceptación

- [x] El procesamiento de streaming no ejecuta efectos secundarios dentro de updaters de React.
- [x] Las tools se deduplican por `tool_call_id` cuando existe y por signature estable como fallback.
- [x] Los artifacts se deduplican por source/signature estable y no por ids aleatorios.
- [x] `ACTIVE_VIDEO_TARGET` se añade, parsea y oculta mediante helpers centralizados.
- [x] La UI activa `streamSubgraphs` en las llamadas de stream para recibir namespaces cuando el backend las emita.
- [x] Existen cards dedicadas para `target_selection_checkpoint`, `revision_plan_checkpoint` y `variant_plan_checkpoint`.
- [x] La UI muestra una card/resumen útil para `route_intent` (como artifact compacto en AgentArtifactCard).
- [x] Hay tests unitarios para helpers de metadata y dedupe de stream.

## Casos de test

- Dos tool calls iguales con el mismo `tool_call_id` no crean dos tools.
- Dos tool results iguales no crean dos artifacts.
- Cambiar de agente finaliza una sola vez el agent run anterior.
- `appendTargetMetadata` + `stripTargetMetadata` no contamina el mensaje visible.
- `parseTargetMetadata` recupera el target enviado.
- `target_selection_checkpoint` se renderiza con lista seleccionable, no como JSON bruto.

## Notas de implementación

- Mantener por ahora `client.runs.stream`, pero pasar `streamSubgraphs: true`.
- Preparar el estado para una migración posterior a `client.threads.stream` o `@langchain/langgraph-sdk/react`.
- No rediseñar visualmente toda la app en esta pasada; priorizar corrección de stream y cards críticas.
