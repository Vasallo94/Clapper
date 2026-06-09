# ADR 0016: Consolidate the JS Workspace on pnpm (remove orphaned npm lockfiles)

## Status

Accepted

## Date

2026-06-09

## Context

Two JS workspace packages carried committed npm lockfiles **in addition** to being declared members of the pnpm workspace (`pnpm-workspace.yaml`):

- `packages/render-service/package-lock.json`
- `packages/web/package-lock.json`

Together with the root `pnpm-lock.yaml` and `packages/agent/uv.lock` (Python), the monorepo had **four lockfiles across two JS package managers**. This forced per-ecosystem maintenance: a transitive bump such as `qs` (pulled by `express@5`) had to be applied both via `pnpm.overrides` at the root and with `npm update … --package-lock-only` inside the package, and Dependabot scanned each lockfile independently, multiplying alerts for the same dependency.

ADR 0015 treated the render-service npm lockfile as a legitimate separate ecosystem, stating it "is not part of the pnpm workspace graph." **That premise is incorrect.** Investigation of the current repository shows:

- `pnpm-workspace.yaml` explicitly lists both `packages/render-service` and `packages/web`. They **are** in the pnpm workspace graph.
- All three Dockerfiles (`render-service`, `agent`, `web`) build with `corepack`/`pnpm install --frozen-lockfile`, copying only `package.json pnpm-lock.yaml pnpm-workspace.yaml` plus each package's `package.json`. **None copy or read any `package-lock.json`.** `docker-compose.yml` builds every service through these Dockerfiles. There is no CI, no `fly.toml`/`railway`/`render.yaml`, and no deploy runbook that uses npm.
- render-service is **not** standalone-deployable via npm even in principle: its `package.json` declares only `express`, `cors`, `better-sqlite3`, but at runtime it `spawn`s `npx tsx scripts/render.ts` / `scripts/render-scene-stills.ts` — root-level scripts that import `@remotion/bundler`, `@remotion/renderer`, etc., declared in the **root** `package.json`. The lockfile describes a subgraph that, on its own, cannot produce a working service. web is analogous (Vite app resolved through the workspace).

The npm lockfiles were vestiges of the original npm setup that survived the npm→pnpm migration by accident (that migration's changelog entry claims `package-lock.json` was removed). They have zero consumers and provide no deploy guarantee — only maintenance cost and duplicate Dependabot scanners.

## Decision

Remove `packages/render-service/package-lock.json` and `packages/web/package-lock.json`. The repository is a **single pnpm workspace** with exactly two lockfiles, one per real ecosystem boundary:

- `pnpm-lock.yaml` (root) — all JavaScript/TypeScript packages, including render-service and web.
- `packages/agent/uv.lock` — the Python agent.

Local development installs once from the repo root with `pnpm install`; there is no per-package `npm install`. Security remediation for JS transitive dependencies happens in one place: range-scoped `pnpm.overrides` in `pnpm-workspace.yaml` (per ADR 0015).

This **supersedes the npm-lockfile handling described in ADR 0015**: its "remediated independently with `npm update qs --package-lock-only`" step and its "up to three tools" consequence no longer apply. JS+Python security bumps now touch two tools (pnpm, uv), not three or four.

## Options Considered

### Option A: Document the coexistence (keep the npm lockfiles)

Risks:

- Perpetuates double/triple maintenance and duplicate Dependabot alerts for artifacts that are never installed by any build.
- Documents a workflow whose justifying premise (standalone npm deploy) does not hold.

### Option B: Consolidate render-service only

Risks:

- Leaves `packages/web/package-lock.json`, an identical orphaned lockfile, in place — an internally inconsistent "consolidated on pnpm" state.

### Option C: Consolidate the whole JS workspace on pnpm (chosen)

Risks:

- A future contributor expecting a standalone `npm install` inside a package will not find a lockfile — mitigated by updating `packages/README.md` to the root `pnpm install` flow.

## Consequences

### Positive

- One JS lockfile to maintain; transitive security floors are set once via `pnpm.overrides`.
- Dependabot stops raising duplicate alerts for the same dependency across multiple JS lockfiles.
- The repository's package-manager story matches reality (pnpm everywhere for JS, uv for Python), removing the contradiction introduced by ADR 0015.

### Negative

- Loses the (non-functional) ability to `npm ci` render-service or web standalone. This was never wired into any deploy path, so the loss is nominal.

## Verification

The container builds are unaffected: each Dockerfile enumerates its `COPY` inputs explicitly and no `package-lock.json` was ever among them. Removing them cannot change the resulting images. Both pnpm filters used by the Dockerfiles and the README (`--filter=render-service`, `--filter=web`) were confirmed to resolve against the scoped package names.
