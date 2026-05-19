# ADR 0013: DeepAgent Container Runtime

## Status

Accepted

## Date

2026-05-18

## Context

The agent service was running in Docker with a full repository bind mount (`.:/app`). That made local development forgiving, but it hid deployment gaps:

- the agent image did not copy `packages/agent/src`, prompts, skills, `graph_server.py`, or `langgraph.json`;
- `SkillsMiddleware` could load skill metadata from a dedicated filesystem backend, but the advertised absolute `SKILL.md` paths were not guaranteed to be readable through the agent's normal `read_file` tool;
- render-service and agent both need access to generated configs, audio and render artifacts;
- `scene_creator` mutates Remotion source files and validates them with Node tooling.

The project needs a deployment model where the image contains static runtime assets, while generated/mutable artifacts are shared explicitly.

## Decision

Build the agent image as a self-contained multi-runtime image:

- Python/uv for DeepAgents and LangGraph.
- Node/pnpm workspace dependencies for `scene_creator` lint/bundle validation.
- Baked-in agent source, prompts, skills, graph config, Remotion source, scripts, content and public assets.

Expose skills through a virtual backend route:

- `/skills/` routes to `packages/agent/skills` with `FilesystemBackend(..., virtual_mode=True)`.
- `SkillsMiddleware` uses the same virtual source path, so progressive disclosure emits readable paths such as `/skills/brand-guidelines/SKILL.md`.

Use Docker named volumes for mutable runtime state:

- `/app/src` for custom scene source mutations shared by agent and render-service.
- `/app/content` for configs.
- `/app/public/audio` and `/app/public/voiceover` for generated media.
- `/app/.generated` for render jobs.

## Options Considered

### Option A: Keep repository bind mount

Risks:

- Works locally but fails as soon as the image runs without the host repo.
- Can accidentally expose unrelated files or credentials into containers.
- Does not document which runtime paths are required.

### Option B: Bake everything and disallow mutable source

Risks:

- Better immutability, but `scene_creator` cannot create or register new custom Remotion scenes.
- Requires a separate feature to move custom-scene registration into render-service or another artifact store.

### Option C: Bake static runtime and share explicit mutable volumes

Risks:

- The shared `src` volume makes Remotion source mutable at runtime.
- Named volumes must be managed during upgrades if seeded source changes and an old volume already exists.

## Consequences

### Positive

- The agent image can start without the developer's repository mounted.
- Skills use stable virtual paths that work with both metadata loading and `read_file`.
- Runtime data sharing is explicit and limited to the paths the pipeline actually mutates.
- `scene_creator` remains functional in containerized runs.

### Negative

- The agent image is larger because it includes Node tooling.
- Runtime source mutation remains a trade-off until custom scene artifacts are moved behind a dedicated service boundary.
