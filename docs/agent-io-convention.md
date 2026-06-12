# Agent I/O Convention

All agent paths are relative to `PROJECT_ROOT` (`/app` in Docker, auto-detected locally).
The single source of truth for path constants is `packages/agent/src/paths.py`.

## READ paths (agent inputs)

| Path                                                         | Description                                 |
| ------------------------------------------------------------ | ------------------------------------------- |
| `src/shared/scene-catalog.json`                              | Available scene types and custom components |
| `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts` | Custom scene component registry             |
| `src/compositions/ClaudeCodeTutorial/scenes/custom/`         | Existing custom scene source code           |
| `public/audio/library/`                                      | Static music and SFX library (committed)    |
| `packages/agent/skills/`                                     | DeepAgents runtime skills (authoritative)   |
| `content/tutorials/*/config.json`                            | Committed tutorial video configs            |
| `content/shorts/*/config.json`                               | Committed short video configs               |

## WRITE paths (agent outputs)

| Path                                                         | Description                                               |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| `public/voiceover/{config_id}/`                              | Generated TTS MP3 files (gitignored)                      |
| `public/audio/{config_id}/`                                  | Copied/generated music and SFX per video (gitignored)     |
| `src/compositions/ClaudeCodeTutorial/scenes/custom/*.tsx`    | New custom scene components                               |
| `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts` | Scene registration (append)                               |
| `.generated/workspace/`                                      | Isolated git clone for self_improve sessions (gitignored) |
| `.afp/drafts/*.addressed`                                    | Sidecar marking a friction draft as addressed by a PR     |

## SUBMIT (HTTP, not filesystem)

| Endpoint                                         | Method | Description                         |
| ------------------------------------------------ | ------ | ----------------------------------- |
| `${RENDER_SERVICE_URL}/api/render`               | POST   | Submit config for rendering         |
| `${RENDER_SERVICE_URL}/api/validate`             | POST   | Validate config against Zod schemas |
| `${RENDER_SERVICE_URL}/api/render/{id}/status`   | GET    | Check render progress               |
| `${RENDER_SERVICE_URL}/api/render/{id}/download` | GET    | Download rendered MP4               |
| `${RENDER_SERVICE_URL}/api/audio/library`        | GET    | List available music tracks         |

## Transient outputs

All render jobs (configs, MP4s, SQLite DB) are written to `.generated/renders/`.
This directory is fully gitignored and ephemeral.

## Environment variables

| Variable                 | Default                       | Description                                                                  |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------------------- |
| `PROJECT_ROOT`           | Auto-detected from `__file__` | `/app` in Docker                                                             |
| `RENDER_SERVICE_URL`     | `http://localhost:3100`       | `http://host.docker.internal:3100` in Docker                                 |
| `RENDER_TIMEOUT_SECONDS` | `300`                         | Max poll wait for render completion                                          |
| `LLM_MODEL`              | `gemini-3.1-pro-preview`      | LLM model for agent                                                          |
| `GITHUB_TOKEN`           | —                             | Fine-grained PAT (contents + pull requests, this repo only) for self_improve |
| `GITHUB_REPO`            | `Vasallo94/Claqueta`          | owner/repo target for clones and PRs                                         |
| `SELF_IMPROVE_THRESHOLD` | `5`                           | Pending AFP drafts that make the orchestrator offer an improvement session   |
