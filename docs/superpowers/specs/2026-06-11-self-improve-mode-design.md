# Self-improve mode — Claqueta trabaja sobre su propio repo

**Fecha:** 2026-06-11
**Estado:** Aprobado (diseño validado en sesión de brainstorming)

## Contexto e intención

Claqueta hoy es reactivo: un humano inicia cada vídeo desde el chat, aprueba la escaleta y el pipeline ejecuta. Queremos que el sistema desplegado funcione "como un Claude Code" sobre su propio repositorio: que detecte fricción en su propio funcionamiento, proponga mejoras a su código creativo y las materialice como pull requests para revisión humana.

**El principio del proyecto se mantiene: automatizar la ejecución, no el criterio.** El agente planifica y ejecuta mejoras; el humano aprueba el plan en el chat y hace merge del PR en GitHub.

## Decisiones de alcance (validadas con el usuario)

| Decisión        | Valor                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visión          | Auto-mejora del propio código, no solo generación de contenido                                                                                                 |
| Zonas editables | Escenas/componentes visuales, skills y prompts del agente, configs de contenido. **El core del pipeline (schemas, render-service, web, scripts) queda fuera.** |
| Gobernanza      | PRs en GitHub para revisión humana. Nunca commit directo a main.                                                                                               |
| Triggers        | Fricción acumulada (drafts AFP), post-mortem por vídeo (deposita en la misma cola), bajo demanda desde el chat. Sin cron.                                      |
| Motor           | El mismo agente Gemini/DeepAgents, extendido con un subgrafo nuevo. Sin servicios nuevos en el compose.                                                        |

## Arquitectura

Un nuevo modo `self_improve` en el sistema de contratos de modos existente (`packages/agent/src/modes.py`, ADR-0009), con un subagente `improver` enrutado por el router de intents como los demás modos.

El backlog de mejoras es `.afp/drafts/` — la infraestructura AFP que ya existe (`src/tools/friction.py`). No se crea un sistema de tracking nuevo: los field reports AFP son la unidad de trabajo.

```
"revisa tu fricción" (chat)  ──┐
post-mortem deposita drafts  ──┤→ router → self_improve
umbral ≥N drafts → propone   ──┘
   improver: lee drafts → prioriza → PLAN → AskUserQuestion (humano aprueba)
   → clone superficial en .generated/workspace/ → rama improve/<slug>
   → edita (solo allowlist: escenas custom, skills/prompts, content/)
   → si toca escenas: renderiza muestra vía render-service como evidencia
   → commit + push + PR (qué fricción resuelve, qué cambió, evidencia)
   → marca drafts como addressed → devuelve link del PR al chat
   → CI (GitHub Actions) valida lint/typecheck → humano hace merge
```

## Componentes

### 1. Contrato de modo (`src/modes.py`)

Nuevo `ModeContract` `self_improve`:

- `requires_target=False`
- `can_write_files=True`, `can_render=True` (render de muestra como evidencia)
- `allowed_agents=("improver",)`
- `checkpoints=("improvement_plan_approval",)` — el plan de mejora se aprueba vía `AskUserQuestion` antes de tocar código. Sin límite de rondas de iteración, como la escaleta.

### 2. Subagente improver

- `src/subagents/improver.py` — subagente DeepAgents con las tools de backlog y workspace.
- `prompts/improver.md` — instrucciones: leer backlog, agrupar fricción relacionada, priorizar por severidad (`blocked` > `degraded` > `cosmetic`), proponer plan, ejecutar tras aprobación.
- `skills/self-improvement/SKILL.md` — criterios de calidad: un PR por tema coherente, descripción con fricción origen + cambio + evidencia, cuándo renderizar muestra, cuándo abstenerse (fricción ambigua → preguntar en el chat).

### 3. Tools de backlog (`src/tools/backlog.py`)

- `list_friction_drafts()` — lista drafts AFP pendientes con resumen (severidad, componente, goal).
- `read_friction_draft(ref)` — contenido completo de un draft.
- `mark_draft_addressed(ref, pr_url)` — anota el draft con el PR que lo aborda (no lo borra; la promoción/cierre AFP sigue siendo humana).

### 4. Tools de workspace git (`src/tools/workspace.py`)

- `prepare_workspace()` — clone superficial del repo (con `GITHUB_TOKEN`) en `.generated/workspace/`. Aislado del working tree del host montado por volumen.
- `write_workspace_file(path, content)` — escritura **con allowlist dura enforced en código** (ver Seguridad).
- `read_workspace_file(path)` / `list_workspace_files(glob)` — lectura libre del clone (para contexto).
- `commit_and_push(branch, message)` — solo acepta ramas `improve/*`; rechaza main. Mensaje en formato Conventional Commits.
- `open_pull_request(branch, title, body)` — API REST de GitHub. Devuelve URL del PR.

### 5. Post-mortem (orquestador)

Paso final de los modos `new_video` y `revise_existing`, tras el cierre del pipeline: el orquestador reflexiona ("¿qué costó más de lo debido?, ¿qué tool/skill/escena causó iteraciones extra?") y deposita los hallazgos vía el `report_friction` existente. Misma tubería que la fricción espontánea — dos fuentes, una cola.

### 6. Trigger automático suave

Al cerrar un vídeo, si `len(drafts pendientes) >= SELF_IMPROVE_THRESHOLD` (env, default `5`), el orquestador **propone** en el chat una sesión de mejora. Nunca la inicia solo.

### 7. Infraestructura

- **Dockerfile del agente**: añadir `git`.
- **Env nuevas** (`.env`, documentadas en `docs/agent-io-convention.md`): `GITHUB_TOKEN` (fine-grained: solo contents + pull-requests de este repo), `GITHUB_REPO` (`owner/repo`), `SELF_IMPROVE_THRESHOLD`.
- **CI nuevo**: `.github/workflows/pr-checks.yml` — `pnpm lint` (ESLint + typecheck) en cada PR. La validación JS/TS vive en CI; el contenedor Python del agente no necesita Node.

## Seguridad

- **Allowlist de escritura enforced en `workspace.py`**, no en prompt:
  - `src/compositions/*/scenes/custom/**`
  - `src/compositions/*/customSceneRegistry.ts`
  - `packages/agent/skills/**`
  - `packages/agent/prompts/**`
  - `content/**`
  - Cualquier otra ruta → error de tool con mensaje explicativo.
- Normalización de rutas antes de validar (sin `..`, sin symlinks fuera del workspace).
- `GITHUB_TOKEN` fine-grained limitado a este repo (contents read/write + pull requests). Sin acceso a Actions, settings ni otros repos.
- Ramas solo `improve/*`; push a `main` rechazado en la tool.
- AFP ya valida que los reports no contengan secretos; los PRs solo contienen archivos de la allowlist.

## Manejo de errores

- Render de muestra falla → **no se abre PR**; se reporta en el chat y se deposita fricción.
- Push/PR falla (token, red) → se reporta en el chat con el estado del workspace para reintento.
- Clone falla → el modo aborta con mensaje claro; nunca opera sobre el working tree del host.
- Draft AFP ilegible/corrupto → se salta y se notifica; no bloquea la sesión.

## Testing

- **Unit** (`packages/agent/tests/`):
  - `test_tools_workspace.py` — allowlist (rutas válidas, inválidas, intentos de escape con `..`), naming de ramas, rechazo de main. Con repo git temporal.
  - `test_tools_backlog.py` — listado, lectura y anotación de drafts sobre `.afp/drafts/` temporal.
  - `test_modes.py` (extender) — contrato `self_improve` y su routing.
- **Integración**: sesión de mejora completa con drafts sembrados y API de GitHub mockeada (sin red).
- **E2E** (skill `e2e-test`): "revisa tu fricción" desde la web UI con un draft real sembrado, verificando plan → aprobación → rama → PR contra un repo de prueba.

## Fuera de alcance (YAGNI)

- Cron / sesiones nocturnas no solicitadas.
- Edición del core del pipeline (schemas, render-service, web, scripts).
- Merge automático de PRs.
- Migración a Claude Agent SDK.
- Métricas/dashboard de auto-mejora.
