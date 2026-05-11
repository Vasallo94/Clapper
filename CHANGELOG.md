# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Config sanitizer (`packages/agent/src/tools/_sanitize.py`) that auto-fixes common LLM mistakes before Zod validation: emphasis enum normalization, terminal line format conversion, duration clamping, callout position normalization, benefits items wrapping, timing.transitionMs clamping, out-of-range beat removal, voiceover.enabled literal coercion, and soundDesign.enabled boolean coercion
- Pre-render Zod schema validation gate in `submit_render` — fails fast with structured errors before posting to render service
- Structured httpx error handling in `submit_render` and `check_render_status` (ConnectError, TimeoutException, HTTPStatusError)
- GraphRecursionError parsing in web frontend — shows user-friendly Spanish message instead of raw traceback
- `validation_failed` artifact handling in web frontend — displays structured validation card for pre-render errors
- `isToolError()` helper in `useAgentStream.ts` for robust tool error detection (regex + JSON parsing)
- 26 unit tests for config sanitizer across 8 test classes (`test_sanitize.py`)
- ADR 0005 documenting schema validation and editorial guardrails
- ADR 0006 documenting scene catalog narrative templates
- ADR 0007 documenting frontend artifact normalization
- ADR 0008 documenting educational video duration defaults
- Docker Compose multi-service setup: `docker compose up` starts agent, render-service, and web together with healthchecks and dependency ordering
- `packages/render-service/Dockerfile` — Node 22 + Chromium headless for containerized Remotion rendering
- `packages/web/Dockerfile` — Node 22 + Vite dev server containerized with `--host 0.0.0.0`
- Makefile targets for Docker-based workflow (`up`, `stop`, `logs`) and native alternatives (`agent-native`, `renderer-native`, `web-native`)
- Narrative metadata and reusable video templates in `src/shared/scene-catalog.json` for template-first video generation.
- `query_scene_catalog` support for searching both scenes and video templates.
- Optional `brief.templateId` and `brief.narrativeArc` fields in shared video schemas.
- ADR 0006 documenting scene catalog narrative templates.
- `audit_content_quality` agent tool for deterministic editorial checks (hook, CTA, copy density, timing, beats, voiceover pacing) before checkpoints and render.
- ADR 0005 documenting schema validation and editorial guardrails for DeepAgents.
- `packages/agent/src/paths.py` — single source of truth for all agent path constants (`PROJECT_ROOT`, `SCENE_CATALOG`, `CUSTOM_SCENES_DIR`, `SCENE_REGISTRY`, `AUDIO_LIBRARY_DIR`, etc.)
- `docs/agent-io-convention.md` — formal specification of agent READ/WRITE/SUBMIT paths and environment variables
- `content/` directory for committed video project configs (tutorials, shorts, presentations)
- `.generated/` directory for all transient pipeline outputs (render jobs, configs, MP4s, SQLite DB)
- npm workspaces configuration for `packages/render-service` and `packages/web`

### Changed

- Agent Docker Compose: added `BG_JOB_ISOLATED_LOOPS=true` env var to isolate each LangGraph run in its own event loop (prevents blocking tool calls from starving concurrent pipelines)
- `submit_render` now sanitizes configs and validates against Zod schemas before posting to render service
- Orchestrator prompt: added validation retry limit (max 2 re-dispatches) to prevent GraphRecursionError loops
- Director prompt: explicit emphasis enum values (`"low"|"medium"|"high"` ONLY) with warning against invalid values
- Copywriter prompt: explicit terminal scene format with `lines: [{kind, text}]` and warning against `output: string[]`
- Validator prompt: clarified that `validate_config` expects JSON string content, not file paths
- `docker-compose.yml` rewritten from 1 service to 3 (agent, render-service, web) with healthchecks and `depends_on` ordering
- Agent `RENDER_SERVICE_URL` changed from `http://host.docker.internal:3100` to `http://render-service:3100` (Docker internal DNS)
- Makefile `up` target now uses `docker compose up --build` instead of 4 background processes
- Copywriter/director prompts now require preserving a selected narrative template before generating scenes and beats.
- `scene-catalog` and `video-best-practices` skills now document template-first generation.
- `validate_config` now runs the Remotion Zod validation script when available and returns schema errors together with asset checks and editorial recommendations.
- DeepAgents prompts now require schema/content-quality validation before advancing from copywriter/director/validator checkpoints.
- `scene_creator` is now registered in the real orchestrator subagent list, not only documented in the prompt.
- Agent path resolution: all 8 Python files now import from `paths.py` instead of computing `Path(__file__).parent.parent...` chains (up to 5 levels deep)
- Render service job outputs moved from `packages/render-service/jobs/` to `.generated/renders/`
- Video configs relocated: `tutorials/` → `content/tutorials/`, `shorts/` → `content/shorts/`, `presentations/` → `content/presentations/`
- `CLAUDE.md` updated with full directory layout, agent I/O convention reference, and corrected paths
- `Makefile` updated for `content/` paths and npm workspace-aware install

### Removed

- `host.docker.internal` dependency for agent→render-service communication
- `.agents/skills/` duplicate skills directory (44 files) — `packages/agent/skills/` is the single authoritative source

### Added

- Docker containerization for LangGraph agent (`make agent` now uses Docker)
- `docker-compose.yml` with agent service, bind mount, and env passthrough
- `make agent-native` escape hatch for running without Docker
- `make agent-logs` and `make agent-shell` helper targets
- ClaudeCodeTutorial composition now supports `hero`, `benefits`, `pricing`, `cta` scene types (previously ProductShort-only)
- `PipelineContext` dataclass (`packages/agent/src/context.py`) for static per-run metadata; fields: `config_id`, `composition`, `width`, `height`, `theme`, `output_dir`, `render_service_url`
- Filesystem virtual state management: all agent prompts now include `## State management` sections specifying `/pipeline/*.json` read/write paths via built-in `read_file`/`write_file`
- `validate_config` registered as orchestrator direct tool for intermediate validation between creative steps
- `runtime` parameter on `submit_render`, `check_render_status`, `generate_voiceover`, `copy_library_track` for DeepAgents `ToolRuntime` context injection
- Summarization middleware (`create_summarization_tool_middleware`) wired into orchestrator for context compression
- Orchestrator prompt: validation between steps (after copywriter and director), pipeline state filesystem docs, agent dispatch instructions for filesystem usage
- Run-state logging in `graph_server.py` for debugging LangGraph pending tool call terminations
- `DISABLE_WRITE_TODOS` env var to suppress `write_todos` tool usage (workaround for Gemini nested format bug)
- "Known runtime behavior" section in `prompts/orchestrator.md` documenting LangGraph run termination and write_todos issues

### Changed

- Callout scene now accepts `"center"` position in addition to `"top"`, `"bottom"`, `"right"` (schema, component, skill)
- `validate_config` / `review_render` return error JSON instead of crashing when given virtual paths — LLM can recover gracefully
- Scene catalog skill updated: callout position includes "center"

### Fixed

- `validate_config` now reads `config_id` from `PipelineContext` runtime — no longer defaults to `"unknown"` when config JSON lacks `id` field
- Copywriter prompt now requires `id` field in config JSON — voiceover files are saved to the correct directory
- Audio planner prompt enforces `voiceover.scenes` as record format (`{"0": "text"}`) — Zod no longer rejects array format at render time
- `list_audio_library()` now searches for `.mp3` files instead of directories — videos will now have background music
- `generate_voiceover()` now checks for scenes presence instead of `enabled: true` flag — voiceover was silently skipped
- `_generate_scene_audio()` base64 handling: bytes written directly, strings decoded, unexpected types raise `ValueError`
- `_find_ffmpeg()` raises `FileNotFoundError` instead of returning bare `"ffmpeg"` string; supports `FFMPEG_PATH` env var
- `submit_render()` defaults changed from ProductShort (1080x1920) to Tutorial (1280x720)
- BeatSchema `narration`, `visual`, `animation` fields are now optional — missing fields no longer block renders
- Orchestrator allows re-dispatching agents on checkpoint rejection with user feedback
- Audio planner prompt always includes `"enabled": true` in voiceover config (required by Zod schema)
- Render service now captures stderr and surfaces actual error messages (Zod validation, bundler crashes) instead of opaque "exit code N"
- All Zod `.optional()` fields in schemas now accept `null` via `.nullable().optional()` — prevents validation failures when Python agents send `null` instead of omitting keys
- DuckDuckGo search tool now handles HTTP 202 responses and guides agent to fallback tools

### Changed

- Researcher agent prompt: limits failed search retries to 2, prioritizes `scrape_product` over `web_search` for known domains, caps total tool calls to 3
- `scrape_product` docstring now lists common Línea Directa slugs and marks it as primary research tool
- Skills restructured from flat `.md` files to proper DeepAgents skill directories (`scene-catalog/SKILL.md`, `brand-guidelines/SKILL.md`, `video-best-practices/SKILL.md`) with YAML frontmatter — enables progressive disclosure via SkillsMiddleware
- Prompts (copywriter, director, audio_planner, sound_engineer) rewritten: domain knowledge moved to skills, prompts now contain only workflow/tools/state-management; each includes `## Skills` section referencing relevant skill directories
- All subagent factories with domain needs now include `"skills": [str(SKILLS_DIR)]` key for SkillsMiddleware integration
- ADR 0003: documents skills/prompts/agents architecture decision (separation of domain knowledge from workflow)

### Fixed

- `submit_render()` now passes `voiceover` and `soundDesign` to render service (audio was silently dropped)
- Removed `icon` string field from `BenefitItemSchema` — was rendering raw text in videos
- Replaced emoji fallbacks in `ProblemSolutionScene` with proper SVG icons (CrossIcon/CheckIcon)

### Changed

- Constrained `icon` field in `IconGridScene` and `BulletSlideScene` to valid SVG lookup keys only
- Copywriter prompt: added visual storytelling principles, scene selection guide, copy density rules
- Director prompt: added visual emphasis/intensity levels and scene-specific direction patterns
- Improved `BenefitsScene` animations: scale effect per item, animated accent line under title
- Improved `HeroScene`: breathing radial gradient, accent line under title
- Improved `PricingScene`: pulsing glow on light variant circle

### Added

- Interactive video preview via `@remotion/player` in web frontend (VideoPlayer component)
- Shared `calculateTotalFrames` pure function in `src/shared/calculateDuration.ts` (used by both Player and calculateMetadata)
- Vite `@remotion-src` path alias for importing Remotion source from web app
- Escaleta preview: CheckpointCard now embeds a Player preview of the proposed scenes
- Visual snapshot tests for `ClaudeCodeTutorial` and `ProductShort` compositions using vitest + pixelmatch + pngjs
- Minimal test fixtures (`tutorial-minimal.json`, `short-minimal.json`) for visual regression testing
- `test:visual` and `test:visual:update` npm scripts for running and updating snapshots
- Scene transitions via `@remotion/transitions` TransitionSeries (fade, slide, wipe) with global config
- VideoResultCard: inline `<video>` player + download button shown after render completes
- `GET /api/render/:id/download` endpoint for downloading rendered MP4s
- `GET /api/render/jobs` endpoint for paginated job listing
- SQLite job persistence for render-service via better-sqlite3 (replaces in-memory Map)
- Conversation persistence: threadId and thread list stored in localStorage, survives page refresh
- ThreadList component in sidebar: switch between conversations, delete old threads, start new ones
- Render service API client (`fetchJobStatus`, `fetchJobs`, `getDownloadUrl`) in web frontend
- `TransitionConfig` Zod schema added to both composition schemas
- `calculateMetadata` adjusts total duration for transition overlap
- Native Python TTS: `generate_voiceover` now calls Gemini TTS directly via `google-genai` SDK instead of subprocess to Node.js script
- SSE reconnection with exponential backoff (3 retries) and 5-min stream timeout
- Tool error tracking in streaming UI (tools starting with "Error" show red status)
- ErrorBanner retry button wired to `stream.clearError`
- Stable `id` field on ToolEntry for consistent React keys
- Chronological agent bubbles interleaved with messages (no longer grouped at bottom)
- RenderProgress and SubagentBadge components integrated (were dead code)
- ARIA labels, semantic HTML, keyboard accessibility across all components
- PipelineStepper `covers` mapping to align 5 high-level steps with internal stages
- User-friendly error messages (ECONNREFUSED, timeout, auth errors mapped to Spanish)
- Cmd/Ctrl+Enter keyboard shortcut for send
- Shared `btnStyle` utility extracted from 4 checkpoint card components
- Unified `checkpointHandlers` factory replacing 8 copy-paste handlers in App.tsx
- Shared `checkpoint_interrupt` helper for 5 Python tool functions
- Centralized `PROJECT_ROOT` in `packages/agent/src/config.py`
- `useMemo` for `precomputeScenes` in CompositionShell (was recomputing every frame)
- TTL eviction (1h) for render service jobs Map
- `AGENT_TO_STAGE` moved to module scope in usePipelineTracker

### Fixed

- `scene_creator` KeyError: `max_attempts` and `attempt` now initialized via `init_node` entry point in the validation graph
- `check_render_status` UnboundLocalError on timeout: `result` is now initialized with a safe default before the polling loop
- Render polling timeout is now configurable via `RENDER_TIMEOUT_SECONDS` env var (default 300)
- Startup warning logged when `RENDER_SERVICE_URL` uses the default localhost value
- Hardcoded `#f59e0b` in DirectionCard replaced with theme tokens

### Removed

- Dead functions `present_sound_chart()` and `generate_audio()` from `tools/sound.py` and their exports/tests
- Subprocess-based voiceover generation (replaced by native Python TTS)

### Added

- DeepAgent graph redesign: 3-subgraph architecture (creative, production, delivery) with 6 human checkpoints
- `voice_generator` subagent for Gemini TTS voiceover generation
- `audio_planner` subagent with unified audio chart checkpoint (CP3) — presents voice + music + SFX together
- `validator` subagent for config coherence checks against disk assets (scene registry, voiceover MP3s, library tracks)
- `reviewer` subagent for post-render MP4 verification via ffprobe (duration, audio, file size)
- `present_direction` tool for director timing/beats checkpoint (CP2)
- `present_audio_chart` tool for unified audio approval
- `present_custom_scene` tool for scene creator code review (CP4)
- `generate_voiceover` tool wrapping Gemini TTS script
- `copy_library_track` tool for library-only sound design
- `validate_config` tool for pre-render asset verification
- `review_render` tool for post-render ffprobe inspection
- `--skip-audio-generation` flag in render script for agent pipeline

### Changed

- Orchestrator reorganized from 4-agent flat pipeline to 3 subgraphs with 8 subagents
- Director now has human checkpoint (CP2) for timing/beats approval
- Sound engineer operates in library-only mode (API generation disabled, uses `copy_library_track`)
- Scene creator includes `present_custom_scene` for human review of generated React components
- `submit_render` passes `_skipAudioGeneration` flag to render service
- Pipeline has 6 human checkpoints: escaleta (CP1), direction (CP2), audio chart (CP3), custom scenes (CP4), validator warnings (CP5), review (CP6)
- Mission Control dark theme UI: 2-panel layout (sidebar with pipeline stepper + event log, main chat panel), DM Sans + JetBrains Mono fonts, CSS animations
- `packages/web/src/components/AppLayout.tsx`, `Sidebar.tsx`, `PipelineStepper.tsx`, `EventLog.tsx`, `Header.tsx`, `InputBar.tsx`, `ChatThread.tsx`: new layout components
- `packages/web/src/hooks/usePipelineTracker.ts`: pipeline state machine derived from POST responses (replaces SSE-based useAgentStream)
- `packages/web/src/theme.ts`: centralized design tokens (colors, fonts, spacing)

### Changed

- `scripts/generate-sound-design.ts`: migrate from ElevenLabs to Google Lyria 3 for music bed and SFX generation, with ElevenLabs as optional fallback and local audio library support
- `packages/web/src/components/SoundChartCard.tsx`: dark theme, `disabled` prop, feedback textarea pattern matching CheckpointCard
- `packages/web/src/components/CheckpointCard.tsx`, `MessageBubble.tsx`, `SubagentBadge.tsx`, `RenderProgress.tsx`, `ErrorBanner.tsx`: dark theme styling
- `packages/web/src/App.tsx`: replaced useAgentStream with usePipelineTracker, fixed checkpoint type discrimination (escaleta vs sound_chart), added sound chart approve/reject handlers
- `packages/web/src/types.ts`: added `CheckpointType`, `PipelineStageId`, `PipelineEvent`; removed SSE-specific types

### Removed

- `packages/web/src/hooks/useAgentStream.ts`: replaced by usePipelineTracker (SSE endpoint incompatible with POST invoke)
- `packages/web/src/components/ChatWindow.tsx`: replaced by ChatThread with SoundChartCard integration

### Fixed

- Blank screen after escaleta approval: frontend now distinguishes `sound_chart_checkpoint` from `escaleta_checkpoint` and renders the correct card
- `SoundChartCard` was defined but never integrated into the chat view
- `stream.connect()` was never called (architectural fix: removed SSE in favor of POST-derived pipeline tracking)
- Orchestrator agent loop: agent re-dispatched researcher after render completion due to missing stop conditions in prompt. Added explicit STOP CONDITIONS section and "never re-dispatch" rule to `prompts/orchestrator.md`. Added `_pipeline_complete` flag in `check_render_status` docstring to reinforce termination.

- `packages/agent/tests/test_orchestrator.py`: integration tests validating orchestrator wiring, prompt file existence, skills availability, and subagent factory return types
- `packages/agent/src/subagents/scene_creator/`: Scene Creator CompiledSubAgent with deterministic lint-register-validate graph loop using LangGraph StateGraph, plus `write_scene`/`read_scene` tools
- `packages/agent/src/subagents/`: researcher, director, copywriter, sound_engineer SubAgent definitions with factory functions
- Comprehensive subagent tests: `tests/test_subagents.py` validates all 4 subagent definitions, tool assignments, and interrupt usage
- `packages/agent/src/tools/` package: split monolithic `tools.py` into `render.py`, `research.py`, `catalog.py`, `sound.py` modules
- `packages/agent/src/orchestrator.py`: multi-agent orchestrator scaffold with researcher, copywriter, director, sound_engineer subagents
- Agent prompts: `orchestrator.md`, `researcher.md`, `director.md`, `sound_engineer.md`, `scene_creator.md`
- Agent skills: `best_practices.md`, `brand_guidelines.md`, `scene_catalog.md`
- New tools: `web_search`, `web_fetch`, `scrape_product` (research), `query_scene_catalog` (catalog), `present_sound_chart`, `list_audio_library`, `generate_audio` (sound)

### Fixed

- `packages/agent/src/orchestrator.py`: fix Gemini 3.1 authentication — load Vertex AI service account credentials explicitly, correct model IDs to `gemini-3.1-pro-preview` / `gemini-3.1-flash-lite-preview`, and default location to `global` (preview models unavailable in regional endpoints)

### Changed

- `packages/agent/src/orchestrator.py`: replaced inline subagent definitions with factory functions from `src/subagents/` — cleaner, tested independently, no duplicate code
- Extracted `CompositionShell` component (`src/shared/CompositionShell.tsx`) and `precomputeScenes` function (`src/shared/useScenePrecomputation.ts`) — eliminates ~80 lines of duplicated precomputation + Series/Sequence/Audio rendering boilerplate from both compositions
- `ClaudeCodeTutorial.tsx` reduced from 173 to 84 lines using `CompositionShell` with `renderScene`/`renderOverlay` callbacks
- `ProductShort.tsx` reduced from 109 to 24 lines using `CompositionShell` with `musicLoop` flag

### Added

- `scripts/generate-scene-catalog.ts` — TypeScript script that reads `customSceneRegistry.ts` and generates `src/shared/scene-catalog.json` with machine-readable catalog of all 26 custom scenes plus builtin scenes for both compositions
- `npm run generate:catalog` script for catalog generation

- Monorepo directory scaffold: `packages/render-service/`, `packages/agent/`, `packages/web/` with placeholder `.gitkeep` files
- `scripts/validate-config.ts` — CLI validation tool that parses a config JSON against `TutorialConfigSchema` or `ProductShortConfigSchema` and exits with code 0 (valid) or 1 (invalid)
- Render service Express bridge (`packages/render-service/`) with 4 HTTP endpoints: `/api/validate` (Zod schema validation), `/api/render` (async job submission), `/api/render/:id/status` (progress tracking), `/api/audio/library` (music track listing)
- Agent project (`packages/agent/`) with `pyproject.toml`, LangGraph/httpx dependencies, and three tools: `present_escaleta()` (LangGraph interrupt for human approval), `submit_render()`, `check_render_status()` (HTTP wrappers for render-service)
- LangGraph ReAct agent (`packages/agent/src/agent.py`) with system prompt from `copywriter.md`, three tools, and MemorySaver checkpointer
- FastAPI application (`packages/agent/src/api.py`) with 3 endpoints: `POST /api/chat` (new message or resume thread), `POST /api/chat/resume` (resume after checkpoint), `GET /api/chat/:threadId` (message history)
- Agent API tests (`packages/agent/tests/test_api.py`) with skip marker for LLM-dependent tests and lazy agent initialization to avoid import failures
- React frontend (`packages/web/`) with Vite, TypeScript, and React 19 — chat interface with escaleta checkpoint cards, approve/request-changes workflow, and API client for agent endpoints

### Fixed

- `ProblemSolutionScene`, `BeforeAfterScene`: replaced hardcoded `#ff5050`/`#50ff78` colors with `tokens.terminal.labelColor`/`tokens.terminal.successColor`
- `ApiRequestScene`: replaced hardcoded panel background, Request/Response label colors, and status color with theme tokens (`tokens.terminal.bg`, `tokens.terminal.successColor`, `tokens.terminal.claude`, `tokens.primary`)
- `BrowserMockupScene`: replaced hardcoded chrome bar, traffic light dots, and URL bar colors with `tokens.terminal.titleBar`, `tokens.terminal.dots[*]`, and `tokens.terminal.bg`
- `CountdownScene`: fixed beat index collision — boxes now stagger correctly when beats are provided (`boxesStartFrame + i * step` instead of `beats[1] + i * step` overwriting per-item with same value)
- `BarChartScene`: added missing `<MascotWatermark animation="idle" />` for theme consistency

### Added

- 4 presentation scene components: `MediaCardScene`, `LogoWallScene`, `TwoColumnTextScene`, `StepListScene`
- 4 demo/technical scene components: `BrowserMockupScene`, `ApiRequestScene`, `CodeDiffScene`, `AnnotatedImageScene`
- 7 custom scene components for animated presentations: `CodeBlockScene`, `SplitScreenScene`, `IconGridScene`, `BigNumberScene`, `ComparisonTableScene`, `SectionTitleScene`, `BulletSlideScene`
- 13 SVG icon components in `svg-icons.tsx`: CheckIcon, CrossIcon, TerminalIcon, CloudIcon, CodeIcon, ShieldIcon, GearIcon, UserIcon, BookIcon, LightbulbIcon, ArrowRightIcon, LayersIcon, LinkIcon
- Vertex AI service account auth for Gemini TTS (`GOOGLE_APPLICATION_CREDENTIALS`)
- `findFfmpeg()` helper in `generate-voiceover.ts` — auto-discovers Remotion's bundled ffmpeg
- Gemini 3.1 Flash TTS Preview model support (`gemini-3.1-flash-tts-preview`)
- Tutorial `skills-claude-code` (14 scenes, ~97s): Skills de Claude Code para desarrolladores LDA
- `.gitignore` patterns for service account key files

### Changed

- `generate-voiceover.ts`: dual auth (Vertex AI service account + API key), upgraded TTS model
- `render.ts`: added `shell: true` to child process calls for Windows compatibility

- Theme `atom-dark` (One Dark Pro palette) for personal videos
- 3 custom scene components: `BlockDiagramScene`, `FileExplorerScene`, `FlowDiagramScene`
- SVG icon components (`svg-icons.tsx`) replacing emoji characters
- Terminal auto-scroll with fixed height container
- Fade-in + slide entry animation on terminal messages
- SVG triangle for Claude label (replacing unicode character)
- Enterprise bootstrap: husky, lint-staged, commitlint, ADRs, specs structure
- Gemini 2.5 Flash TTS voiceover integration (`scripts/generate-voiceover.ts`)
- `<Audio>` component in ClaudeCodeTutorial for per-scene voiceover playback
- Voiceover auto-generation step in render pipeline (`scripts/render.ts`)
- Schema fields `provider` and `language` in voiceover config
- Spanish narration for claude-code-memory tutorial (9 scenes, voice: Orus)
- Custom Claude Code hooks: config validator, render reminder, voiceover cost tracker
- Editorial direction model (`src/utils/direction.ts`): Brief, Timing, Beats, VoiceoverConfig schemas
- `remotion-director` skill for refining timing/beats on existing configs
- Pixel logo pipeline: `generate-pixel-logo.ts`, PixelLogo component, PixelLogoPreview composition
- Dual TTS support (Gemini + ElevenLabs) with per-scene overrides in `generate-voiceover.ts`
- Dynamic scene duration from measured audio length in `calculateMetadata.ts`
- Beat-driven animation timing across all scene components
- ADR 0001 (pixel logo pipeline) and ADR 0002 (editorial direction model)
- Tutorial claude-code-memory V2 with narrative brief, beats, and pixel logo
- Sound design pipeline: `scripts/generate-sound-design.ts` with ElevenLabs SFX V2 + Music API
- `src/utils/audioMix.ts` — ducking, SFX trigger/end frame, volume utilities
- Music bed `<Audio>` with dynamic ducking in ClaudeCodeTutorial and ProductShort compositions
- Per-scene SFX `<Audio>` with trigger-type mapping (scene-start, beat, typewriter, reveal, transition, accent-line)
- `SoundDesignSchema`, `SfxEntrySchema`, `MusicBedSchema` in direction.ts
- `transitionMs` field in TimingSchema for scene transition silence gaps
- `sound-engineer` skill — 5-step workflow for automated sound design with human approval gates
- Music-aware rules in `remotion-director` skill (narrative pauses, transition heuristics, beat gaps)
- Agent pipeline principle in CLAUDE.md and AGENTS.md: automate execution, not criteria
- Karaoke subtitles: word-by-word synchronized captions via ElevenLabs `/with-timestamps` endpoint
- `KaraokeSubtitles` component with chunked word display and highlight animation
- `SubtitlesConfigSchema` in `schema.ts` (enabled, style, fontSize, position)
- `LogoWatermark` component: PixelLogo with procedural smoke particles for non-mascot themes
- `SmokeParticles` component: deterministic particle system using seeded PRNG
- Seamless music loop (`lofi-tech-2-loop.mp3`) via ffmpeg crossfade

### Changed

- LogoWatermark now renders per-scene (inside Series.Sequence) and is hidden during intro scenes
- Voiceover text uses literal `.md` and `/command` instead of spelled-out "punto md" / "barra command" so subtitles display correctly
- Voiceover script now uses ElevenLabs `/with-timestamps` endpoint, saves word-level `.timestamps.json` per scene
- Music bed no longer requires `loop` — crossfaded track is longer than video duration
- Voice changed to David Martin (Calm) `y6WtESLj18d0diFRruBs` for Spanish peninsular narration
- SFX reduced to keyboard + new epic cinematic intro braam

- Font sizes increased across all scenes for mobile readability
- Prettier config completed (semi: false, printWidth: 120, trailingComma, arrowParens)
- All scene schemas merged with `DirectionSceneFieldsSchema` (timing + beats fields)
- Skills `remotion-tutorial-generator` and `remotion-short-ld` updated with editorial brief step

### Fixed

- FlowDiagramScene orb animation rewritten with per-node cycle system
- Terminal content overflow with estimateLineHeight() scroll calculation
- FlowDiagramScene: fixed broken indentation in arrow generation, removed IIFE pattern, fixed `frame` vs `localFrame` bug in outro
- BlockDiagramScene: fixed beat-to-block mapping (beat[0] is title, not first block) and connection timing (now appears after all blocks with stagger)

## 2026-03-23

### ProductShort — Composición vertical para marketing

- Nueva composición `ProductShort` (1080×1920, 9:16) con 4 escenas: `hero`, `benefits`, `pricing`, `cta`
- Skill `/short-ld` para generar shorts de marketing de Línea Directa automaticamente
- `render.ts` soporta campo `composition` en el config (backwards compatible)
- Smoke test: `shorts/seguro-coche-demo/config.json`
- README reescrito como plataforma multi-composición

### PhoneMascot SVG y TerminalScene redesign

- `PixelPhoneMascot` reemplazada por `PhoneMascot` SVG fiel al logo real de Línea Directa (teléfono con ruedas, auricular, cable, teclado 3×3)
- Prop `darkBg` para outlines blancos sobre fondos oscuros (terminal)
- `TerminalScene` rediseñada para simular la CLI real de Claude Code: cajas "You", etiqueta "⏵ Claude", barra de estado con modelo/contexto/coste
- Fondo de terminal LD: gradiente radial cálido (`#2d1c22` → `#141014`)

### Refactoring del sistema de tokens y componentes

- Tokens de terminal cableados: `sceneBackground`, `labelColor`, `successColor`, `statusBarBg`, `borderColor`, `separatorColor`, `costColor`, `userMessageBg`, `userMessageBorder`
- `MascotWatermark` — componente reutilizable para mascota en esquina (3 escenas)
- `useSlideIn()` hook — reemplaza patrón spring+interpolate repetido en 5 escenas
- `createCalculateMetadata<T>()` — factory genérica para ambas composiciones
- Tipos de escena exportados desde `schema.ts` (`IntroSceneProps`, etc.)
- `monoFontFamily` en tokens (eliminada carga separada de JetBrains Mono)
- Todas las escenas de ProductShort tokenizadas (eliminados colores hardcodeados)
- Eliminados tokens muertos: `backgroundAlt`, `secondaryForeground`, `primaryHover`, `primaryActive`, `terminal.cursor`
- Eliminadas comprobaciones `isLD` / `useTheme()` en todas las escenas

### Escaleta validation — flujo de aprobación de scripts

- Nuevo paso en ambas skills: presentar escaleta completa al usuario via `AskUserQuestion` antes de generar config.json
- Bucle sin límite de iteraciones hasta aprobación
- `remotion-tutorial-generator`: Paso 4 (Escaleta) + Paso 3 (Copywriting) extraído como paso explícito
- `remotion-short-ld`: Paso 3 (Escaleta) insertado entre Copywriting y Config
- Regla global en `CLAUDE.md`: toda skill de vídeo debe validar la escaleta

### Tema por defecto y tutorial /plugin

- Tema `"linea-directa"` establecido como default obligatorio para todas las composiciones
- Tutorial `/plugin` (54s, 7 escenas): descubrir, instalar y crear plugins de Claude Code

## 2026-03-22

### ClaudeCodeTutorial — Composición horizontal para tutoriales

- Composición `ClaudeCodeTutorial` (1280×720) con 5 escenas: `intro`, `terminal`, `callout`, `outro`, `custom`
- `TerminalScene` con efecto typewriter (command), streaming (claude) e instant reveal (output)
- Sistema de temas: `default` (oscuro/verde) y `linea-directa` (blanco/rojo #CC3333)
- `PixelPhoneMascot` — mascota pixel art del teléfono rojo de Línea Directa
- `customSceneRegistry` para escenas custom por composición
- Skill `/tutorial-generator` — investiga, genera config y renderiza tutoriales de Claude Code
- Script `render.ts` con bundler + Tailwind webpack override
- Tutoriales: `compact-command`, `plan-command`, `git-worktrees-claude-code`

### Infraestructura

- `CLAUDE.md` con arquitectura y constraints del proyecto
- Remotion best practices skill integrada
- VHS/screenRecording añadido y luego eliminado (TUI de Claude Code incompatible con VHS)
- Fix: eslint 9.19→9.39 (ReDoS en @eslint/plugin-kit)
