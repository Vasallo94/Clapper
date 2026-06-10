# ADR 0015: Transitive Security Remediation via pnpm Overrides

## Status

Accepted

## Date

2026-06-09

## Context

Dependabot reported 6 vulnerabilities on the default branch (1 critical, 5 moderate) spanning the three package ecosystems of the monorepo:

- root pnpm workspace (`vitest`, `qs`, `ws`);
- the standalone npm lockfile in `packages/render-service` (`qs`);
- the `uv` Python lockfile in `packages/agent` (`starlette`, `idna`).

Of these, `vitest` is a direct dev dependency (its `^3.2.4` range already admitted the patched `3.2.6`), and the Python packages are transitive but bumped cleanly by `uv lock --upgrade-package`. The hard case was `qs` and `ws` in the pnpm root: both are **purely transitive** — no `package.json` in the workspace declares them — so `pnpm update qs ws` is a no-op (pnpm's `update` command only operates on declared dependencies). Their vulnerable copies are pulled by `express@5` (via `body-parser`), `@remotion/renderer`, `@google/genai` and `langsmith`, none of which had released a parent bump pinning the patched versions yet.

We needed a mechanism to force the patched versions of transitive dependencies into the lockfile, deterministically and reproducibly, without waiting on upstream parents.

## Decision

Use **`overrides` in `pnpm-workspace.yaml`**, scoped to the exact vulnerable version ranges reported by the advisories:

```yaml
overrides:
  "qs@>=6.11.1 <=6.15.1": "6.15.2"
  "ws@>=8.0.0 <8.20.1": "8.20.1"
```

The selective `pkg@range` key form ensures the override only replaces versions inside the vulnerable window; any copy already outside that range is left untouched.

The `render-service` npm lockfile is remediated independently with `npm update qs --package-lock-only`, since it is not part of the pnpm workspace graph.

## Options Considered

### Option A: `pnpm.overrides` in the root `package.json`

Risks:

- In pnpm 10+ with a workspace present, configuration (overrides, `allowBuilds`, etc.) is read from `pnpm-workspace.yaml`; the `package.json` `pnpm` field is **silently ignored**. Verified empirically — the install reported "Already up to date" and never re-resolved.
- Splits pnpm configuration across two files.

### Option B: Plain `pnpm update qs ws`

Risks:

- No-op for purely transitive dependencies — nothing is declared to update.
- Cannot target a security floor at all.

### Option C: Wait for upstream parents to bump

Risks:

- Leaves a critical/moderate exposure open indefinitely on the default branch.
- Outside our control.

### Option D: Selective `overrides` in `pnpm-workspace.yaml` (chosen)

Risks:

- One more piece of dependency configuration to maintain.
- A stale override could mask a future legitimate version if written too broadly — mitigated by scoping to the exact vulnerable range.

## Consequences

### Positive

- Deterministic, reproducible patched versions for transitive vulnerabilities, independent of upstream release timing.
- Range-scoped overrides self-expire: once parents ship `qs`/`ws` versions outside the vulnerable window, the override stops matching and no longer constrains resolution — it is not a permanent pin that would block legitimate bumps.
- Configuration lives in the canonical pnpm 10+ location.

### Negative

- Overrides must be revisited periodically; a forgotten override scoped too broadly could hide future advisories or block upgrades.
- Per-ecosystem remediation is required (pnpm overrides do not reach the `render-service` npm lockfile or the `uv` lockfile), so security bumps touch up to three tools.
