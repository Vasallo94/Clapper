---
name: e2e-test
description: Drive a full end-to-end test of the video generation platform through the browser. Use this skill whenever testing the Docker Compose stack, verifying a video generation flow, checking the chat UI, debugging pipeline stage transitions, or validating that a fix actually works in the running app. Also use after deploying changes to any of the 3 services (agent, render-service, web) to catch regressions. Even if the user just says "test it" or "does it work?" in the context of the video platform, this is the right skill.
---

# E2E Video Pipeline Test

This skill drives the video generation platform through its browser UI exactly like a real user would — type a topic, watch the pipeline run, verify the output. The platform has three Docker Compose services (agent on :2024, render-service on :3100, web on :5173) that must all be healthy.

The reason this skill exists is that the platform has a history of bugs that only surface during real E2E runs — prop mismatches that crash renders, pipeline trackers that desync, streaming cards that appear in wrong order. Unit tests can't catch these because they span the full agent→render→UI chain.

## Before you start

```bash
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

All 3 services must show "healthy". If not:

```bash
docker compose up -d --build
```

Wait for healthchecks to pass (~30s) before proceeding. The agent depends on render-service being healthy first.

## Running the test

Use Chrome DevTools MCP or Playwright to drive the browser at `http://localhost:5173`.

### The flow

1. **Send a generation request** — type a topic in the input bar (in Spanish, e.g. "Crea un video sobre testing en Python"). If an onboarding modal appears, select a video type and confirm it dismisses cleanly.

2. **Watch the pipeline** — the right sidebar shows a pipeline tracker that should advance through these stages in order:
   - Investigador (research)
   - Guionista (script)
   - Director (direction)
   - Planificador de audio (audio)
   - Generador de voz (voice)
   - Renderizado (render)

   Take snapshots periodically to verify each stage transitions from pending → active → done. The whole pipeline typically takes 2-4 minutes.

3. **Check completion** — when the stream ends, the pipeline tracker should auto-advance to "Completado" and a video result card should appear in the chat with a player and download link.

## What to verify

These checks come from real bugs found during production testing. Each one has bitten us before — that's why it's on the list.

### Rendering correctness

- **Markdown rendering**: Chat messages must render formatted text (bold, headers, lists). If you see raw `**text**` or `# heading`, react-markdown isn't processing the content.
- **Custom scene titles**: If the video uses custom components (SplitScreenScene, IconGridScene, BulletSlideScene), their titles should display actual text, not "-" or empty string. This bug comes from prop extraction failing to walk nested data structures.
- **No render crashes**: The most common crash is SplitScreenScene receiving `{title, subtitle}` when it expects `{label, items[]}`. Check browser console for TypeErrors.

### Pipeline state management

- **Tracker advances**: Each stage should visually transition. If the tracker gets stuck on one stage while the chat shows the next agent working, there's a desync between stream events and UI state.
- **Auto-completion**: When the stream finishes, the tracker must reach "Completado" without manual intervention. This was a bug where the final checkpoint wasn't triggering the done state.
- **Video detection**: The video result card should appear automatically when the render completes. It relies on thread_id matching — if it doesn't appear, check the stream enrichment logic.

### Chat UI behavior

- **Subagent cards**: Each agent (investigador, guionista, etc.) gets a collapsible card. Only the currently active one should be expanded; previous ones should auto-collapse.
- **Streaming order**: Text content should stream before or alongside checkpoint cards, not after. If cards jump around, there's a rendering order issue.
- **Thread isolation**: If you create a new thread (click "+" or start new conversation), the previous pipeline state must fully reset.

### Content quality

- **Spanish (es-ES)**: All agent output must be in Spanish. English content means the agent prompts aren't enforcing the language constraint.
- **No blank scenes**: Every scene in the rendered video should have visible content. Blank scenes usually mean a voiceover timing mismatch or missing text props.

## Reporting results

After the test completes, report:

1. **Video stats**: duration, file size, scene count
2. **Bugs found**: reference the specific check that failed and include screenshots
3. **Console errors**: any JavaScript errors from the browser console
4. **Overall verdict**: pass (all checks green), partial (non-blocking issues), or fail (blocking bugs)
