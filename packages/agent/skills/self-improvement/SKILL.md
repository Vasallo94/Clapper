---
name: self-improvement
description: Criterios de calidad para sesiones de auto-mejora — cómo convertir drafts AFP en PRs revisables, cuándo renderizar evidencia y cuándo abstenerse.
---

# Self-improvement — criterios de calidad

## Anatomía de un buen PR de auto-mejora

- **Título**: Conventional Commits (`fix(scene): ...`, `docs(skill): ...`).
- **Descripción** con tres secciones obligatorias:
  1. **Fricción origen**: refs de los drafts AFP abordados y resumen del síntoma.
  2. **Cambio**: qué archivos y por qué este enfoque (el mínimo que resuelve la fricción).
  3. **Evidencia**: job id y resultado del render de muestra (si tocaste escenas/configs),
     o por qué no aplica (cambios solo de skills/prompts).

## Cuándo renderizar muestra

- Tocaste cualquier `.tsx` de escena o `customSceneRegistry.ts` → SIEMPRE.
- Tocaste un `config.json` de content/ → SIEMPRE (el config completo).
- Solo skills/prompts del agente → no aplica; dilo en la descripción.

## Cuándo abstenerse

- El draft describe agent_misuse: la mejora correcta suele ser documentación
  (skill/prompt), no código.
- La fricción requiere tocar core (schemas, render-service, web): fuera de tu
  alcance. Dilo en el chat y sugiere que el humano lo aborde; marca el draft
  como fuera de alcance en tu informe final (NO con mark_draft_addressed).
- Dos drafts se contradicen: pregunta antes de elegir bando.

## Tamaño

- ≤ 5 archivos y ≤ ~300 líneas de diff por PR. Más grande = trocea en
  varios PRs/sesiones.
