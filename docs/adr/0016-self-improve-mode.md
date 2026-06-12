# 0016 — Modo self_improve: auto-mejora vía PRs sobre el propio repo

## Estado

Aceptado — 2026-06-11

## Contexto

Claqueta acumula fricción operativa (drafts AFP de `report_friction`) que
solo se procesaba manualmente. Queremos que el sistema desplegado convierta
esa fricción en mejoras de su propio código creativo, manteniendo el
principio del proyecto: automatizar la ejecución, no el criterio.

## Opciones evaluadas

1. **Modo nuevo en el grafo existente (elegida)** — subagente `improver` +
   contrato `self_improve`; backlog sobre AFP; PRs para revisión humana.
   Riesgo: el agente edita código que define su propio comportamiento →
   mitigado con allowlist dura en código, ramas improve/\*, y merge humano.
2. **Servicio improver separado en el compose** — más aislamiento, pero dos
   cerebros, tooling duplicado e IPC para el trigger desde el chat.
3. **Motor Claude Agent SDK dedicado** — capacidades de ingeniería superiores
   out of the box, pero segunda factura/stack y descartado por el usuario.

## Decisión

Opción 1. Detalles en `docs/superpowers/specs/2026-06-11-self-improve-mode-design.md`.

Decisiones de seguridad clave:

- Allowlist de escritura enforced en `workspace.py` (no en prompt), con
  doble validación en `commit_and_push` sobre los archivos staged.
- Clone superficial aislado en `.generated/workspace/`; nunca el working
  tree del host.
- Ramas solo `improve/*`; push a main rechazado en la tool; merge humano.
- Token fine-grained limitado a contents + pull requests de este repo.
- Lint/typecheck en GitHub Actions, no en el contenedor del agente.

## Consecuencias

- (+) La fricción AFP gana un consumidor automático con criterio humano en
  los dos puntos de control (plan y merge).
- (+) El post-mortem por vídeo alimenta la misma cola — una sola tubería.
- (−) Un PR de skills/prompts mal revisado puede degradar el comportamiento
  futuro del agente: la revisión humana de esos PRs es la última línea.
- (−) El clone superficial por sesión cuesta ancho de banda; aceptable al
  ritmo actual de sesiones.
