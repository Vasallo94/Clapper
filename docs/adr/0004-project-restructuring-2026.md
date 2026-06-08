# ADR 0004: Project Restructuring for Agent Path Clarity

## Status

Accepted

## Date

2026-05-05

## Context

The AI agent pipeline (LangGraph + DeepAgents) frequently failed to find correct file paths for reading inputs and writing outputs. Three root causes:

1. **Fragile path resolution.** Eight Python files computed `PROJECT_ROOT` independently via `Path(__file__).resolve().parent.parent...` chains up to 5 levels deep. Moving any file broke resolution silently.
2. **Mixed transient and source artifacts.** Render jobs (SQLite DB, config copies, MP4s) lived inside `packages/render-service/jobs/`, mixing ephemeral outputs with committed source code. Agents couldn't distinguish "write here" from "don't touch."
3. **Ambiguous content vs. code boundary.** Video configs sat at project root (`tutorials/`, `shorts/`, `presentations/`) alongside source directories (`src/`, `packages/`, `scripts/`). No convention told agents where user content lives vs. application code.
4. **Duplicate skills.** `.agents/skills/` (Claude Code Superpowers plugin) and `packages/agent/skills/` (DeepAgents runtime) maintained parallel copies of the same skill files. 7 rule files had already diverged, causing inconsistent agent behavior.

## Decision

### 1. Centralized path constants (`packages/agent/src/paths.py`)

Single module defines all well-known paths as `Path` constants derived from `PROJECT_ROOT` (env var with file-relative fallback). All other agent modules import from `paths.py` instead of computing paths inline.

**Evaluated alternative:** Keep `config.py` as the path authority and add more constants there. Rejected because `config.py` also handles runtime config (LLM model, timeouts), and mixing path topology with runtime settings makes both harder to reason about.

### 2. Transient outputs in `.generated/`

All ephemeral pipeline artifacts (render jobs, generated configs, MP4s, SQLite DB) write to `.generated/renders/` at project root. This directory is fully gitignored.

**Evaluated alternative:** Keep outputs inside each package (`packages/render-service/jobs/`, `packages/agent/output/`). Rejected because agents need a single, predictable location for all pipeline artifacts, and scattering outputs across packages makes cleanup and Docker volume mounts more complex.

### 3. Video configs in `content/`

Committed video project configs moved to `content/tutorials/`, `content/shorts/`, `content/presentations/`. This creates a clear boundary: `content/` = user-authored data (agent reads), `src/` = application code, `packages/` = service code, `.generated/` = ephemeral outputs (agent writes).

**Evaluated alternative:** Namespace under `projects/` or `videos/`. Chose `content/` because it's the most widely understood convention (Hugo, Gatsby, Next.js content directories) and reads naturally in the agent I/O convention.

### 4. Single skills source

Deleted `.agents/skills/` (44 files). `packages/agent/skills/` is the sole authoritative location. DeepAgents runtime loads skills from there at invocation time. Claude Code Superpowers no longer has a separate copy to diverge from.

**Evaluated alternative:** Symlink `.agents/skills/` → `packages/agent/skills/`. Rejected because symlinks add tooling complexity (Windows, Docker bind mounts, git config) for no benefit — Claude Code can reference skills from any path.

### 5. npm workspaces

Root `package.json` declares `workspaces: ["packages/render-service", "packages/web"]`. Shared dependencies hoist to root `node_modules/`. `packages/agent` stays out (Python/uv manages its own deps).

### 6. Agent I/O convention

`docs/agent-io-convention.md` formally documents which paths agents read from, write to, and submit to via HTTP. All paths are relative to `PROJECT_ROOT` (`/app` in Docker, auto-detected locally).

## Consequences

### Positive

- Agent path resolution is a single `import` away — no fragile parent chains.
- Clear read/write boundary: agents read from `content/`, `src/shared/`, `public/audio/library/`; write to `public/voiceover/`, `public/audio/`, `.generated/`.
- `git clean -fd .generated/` wipes all transient artifacts without touching source.
- npm workspace hoisting eliminates duplicate `react`, `remotion`, and `zod` installs across packages.
- Skills divergence is impossible — single source, single consumer.

### Negative

- All `tutorials/` and `shorts/` references in external bookmarks, scripts, or documentation need updating. Mitigated by updating `CLAUDE.md`, `Makefile`, and `.gitignore` in the same change set.
- `paths.py` becomes a coupling point — all agent modules depend on it. Acceptable because path topology genuinely is shared state, and the alternative (scattered inline paths) is strictly worse.

### Risks

- **Docker bind mount assumption.** `PROJECT_ROOT=/app` in Docker assumes the entire repo is mounted at `/app`. If the mount point changes, agents break. Mitigated by the env var override.
- **npm workspace hoisting conflicts.** If `packages/web` or `packages/render-service` need incompatible versions of a shared dep, hoisting will fail. Mitigated by the fact that both packages already share the same React and Remotion versions.

## References

- `packages/agent/src/paths.py` — path constants
- `docs/agent-io-convention.md` — agent I/O convention
- Commits: `7a5df02` (Phase 0), `bb3a990` (Phase 1), `187a98c` (Phase 2), `584d73f` (Phase 3), `fab3c3b` (Phase 4), `cb61381` (Phase 5)
