# Modo self_improve — auto-mejora vía PRs

## Descripción

Nuevo modo `self_improve` del orquestador: el agente lee su backlog de fricción (drafts AFP en `.afp/drafts/`), propone un plan de mejora que el humano aprueba en el chat, ejecuta los cambios en un clone aislado (`.generated/workspace/`) y abre un PR en GitHub para revisión humana. Las fuentes del backlog son la fricción espontánea (`report_friction`, ya existente) y un nuevo paso de post-mortem al cerrar cada vídeo.

Diseño completo: `docs/superpowers/specs/2026-06-11-self-improve-mode-design.md`.

## Criterios de aceptación

- [ ] Existe el `ModeContract` `self_improve` con checkpoint `improvement_plan_approval` y el router lo activa ante intents como "revisa tu fricción" / "mejora X".
- [ ] El subagente `improver` lee y prioriza drafts AFP (`blocked` > `degraded` > `cosmetic`) y presenta un plan vía `AskUserQuestion` antes de tocar código.
- [ ] `write_workspace_file` rechaza en código (no en prompt) cualquier ruta fuera de la allowlist: escenas custom, `customSceneRegistry.ts`, `packages/agent/skills/`, `packages/agent/prompts/`, `content/`.
- [ ] `commit_and_push` solo acepta ramas `improve/*` y rechaza main; los mensajes siguen Conventional Commits.
- [ ] `open_pull_request` crea el PR con descripción que enlaza la fricción origen y la evidencia; `mark_draft_addressed` anota el draft con la URL del PR.
- [ ] Si el cambio toca escenas, se renderiza una muestra vía render-service; si el render falla, no se abre PR.
- [ ] Tras cerrar un vídeo en `new_video`/`revise_existing`, el post-mortem deposita fricción vía `report_friction`, y si hay ≥ `SELF_IMPROVE_THRESHOLD` drafts el agente propone (no inicia) una sesión de mejora.
- [ ] `.github/workflows/pr-checks.yml` ejecuta lint + typecheck en cada PR.
- [ ] El clone de trabajo vive en `.generated/workspace/` y nunca se opera sobre el working tree del host.

## Casos de test

- Allowlist: ruta válida (`content/tutorials/x/config.json`) acepta; ruta core (`src/Root.tsx`) rechaza; escape (`../../etc/passwd`, symlink fuera) rechaza.
- Ramas: `improve/fix-terminal-timing` acepta; `main` y `feature/x` rechazan.
- Backlog: listar drafts sembrados, leer uno, anotarlo con PR URL sin borrarlo.
- Routing: "revisa tu fricción" → `self_improve`; "haz un vídeo sobre X" → `new_video` (sin regresión).
- Integración: sesión completa con GitHub mockeado → plan → aprobación → rama → "PR" → drafts anotados.
- E2E: draft real sembrado, flujo desde la web UI hasta PR en repo de prueba.
