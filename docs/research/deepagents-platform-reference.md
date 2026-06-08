# DeepAgents Platform Reference — Remotion Video Pipeline

> Compiled from 16 research agents analyzing source code (v0.5.3), official docs, and existing skills.
> Date: 2026-04-20

---

## 1. create_deep_agent() — Key Parameters

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="google_vertexai:gemini-2.5-pro",     # str | BaseChatModel
    tools=[my_tool],                             # additional tools (merged with built-in)
    system_prompt="You are...",                  # prepended before base prompt
    subagents=[copywriter, director, ...],       # SubAgent | CompiledSubAgent | AsyncSubAgent
    skills=["/skills/project/"],                 # skill source paths (progressive disclosure)
    memory=["/memories/AGENTS.md"],              # AGENTS.md paths (always in prompt)
    permissions=[FilesystemPermission(...)],      # read/write access rules
    backend=LocalShellBackend(...),              # file storage + execution backend
    checkpointer=MemorySaver(),                  # state persistence
    store=InMemoryStore(),                       # cross-thread persistent storage
    middleware=[MyMiddleware()],                  # custom middleware (inserted after base stack)
    interrupt_on={"dangerous_tool": True},       # tool-level human approval
)
```

Default model: `claude-sonnet-4-6`. Built-in tools: `write_todos`, `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`, `execute` (if sandbox backend), `task` (if subagents).

## 2. SubAgent System

### SubAgent (declarative, synchronous)

```python
from deepagents import SubAgent

copywriter = SubAgent(
    name="copywriter",
    description="Generates video escaletas and config.json from user requests",
    system_prompt="You are a video copywriter...",
    model="google_vertexai:gemini-2.5-pro",     # optional, inherits parent
    tools=[submit_escaleta, validate_config],    # optional, inherits parent
    skills=["/skills/scene-catalog/"],           # optional
    permissions=[...],                           # optional, inherits parent
    response_format=EscaletaResponse,            # optional, structured output
)
```

### CompiledSubAgent (pre-built graph)

```python
from deepagents import CompiledSubAgent

director = CompiledSubAgent(
    name="director",
    description="Editorial pass: timing, beats, sync audio/visual",
    runnable=my_custom_langgraph,  # must have "messages" in state
)
```

### Dispatch via `task` tool

The orchestrator calls subagents via the built-in `task(description, subagent_type)` tool. Context flows: parent state (minus messages/todos) is copied to subagent. Result flows back as a ToolMessage.

### Parallel dispatch

The LLM can emit multiple `task` tool calls in one response for parallel execution. The system prompt encourages this.

## 3. Backend System

### LocalShellBackend (for our use case)

```python
from deepagents.backends.local_shell import LocalShellBackend

backend = LocalShellBackend(
    root_dir="/path/to/remotion-playground",
    virtual_mode=False,         # agent needs real paths for npx
    inherit_env=True,           # CRITICAL: npx needs PATH, NODE_PATH
    timeout=300,                # 5 min default for renders
    max_output_bytes=200_000,
)
```

Provides: all file operations (ls, read, write, edit, glob, grep) + shell execution (`execute`).

### CompositeBackend (mixed routing)

```python
from deepagents.backends.composite import CompositeBackend
from deepagents.backends.store import StoreBackend

backend = CompositeBackend(
    default=LocalShellBackend(...),     # filesystem + shell
    routes={
        "/memories/": StoreBackend(     # persistent cross-thread
            namespace=lambda rt: ("remotion-agent", "memories"),
        ),
    },
)
```

`execute()` always delegates to default backend.

## 4. Skills System (Progressive Disclosure)

Skills = lazy-loaded procedural knowledge. Only name + description in prompt; full content loaded on demand via `read_file`.

### Skill structure

```
/skills/project/scene-catalog/
├── SKILL.md              # YAML frontmatter + instructions
└── references/
    └── SCENE_PROPS.md    # Detailed props per scene
```

### SKILL.md format

```yaml
---
name: scene-catalog
description: "Available Remotion scene components, their props, and usage patterns. Use when generating video configs or creating new scenes."
---
# Scene Catalog
...
```

### Multi-source priority

```python
skills=["/skills/base/", "/skills/project/"]  # later sources override same-name skills
```

## 5. Memory System

Memory = eagerly-loaded semantic knowledge (always in prompt). Agent updates via `edit_file`.

```python
memory=["/memories/AGENTS.md"]
```

With StoreBackend routing, memories persist across threads (conversations).

## 6. Human-in-the-Loop

### Two mechanisms

1. **`interrupt_on`** — declarative, per-tool approval gates
2. **`interrupt()`** — imperative, call inside any tool/node

### interrupt() pattern (recommended for our checkpoints)

```python
from langgraph.types import interrupt

def submit_escaleta(scenes, brief):
    decision = interrupt({"type": "escaleta", "scenes": scenes, "brief": brief})
    if decision.get("approved"):
        return "APPROVED"
    return f"CHANGES REQUESTED: {decision.get('feedback')}"
```

### Resume from client

```python
result = agent.invoke(Command(resume={"approved": True}), config=config, version="v2")
```

### Subagent interrupts bubble up

When a subagent calls `interrupt()`, it bubbles up through the parent graph to the client. The client resumes with the same `thread_id` — transparent to the client whether it came from main agent or subagent.

### Multi-checkpoint flow (escaleta + sound chart)

```
invoke(message) → runs until escaleta interrupt → returns interrupts[0]
invoke(Command(resume=approve)) → continues until sound chart interrupt → returns interrupts[0]
invoke(Command(resume=approve)) → continues to render → returns final result
```

Same `thread_id` throughout. Checkpointer tracks full state including subagent positions.

## 7. Middleware Stack (exact ordering)

```
 1. TodoListMiddleware
 2. SkillsMiddleware              (if skills provided)
 3. FilesystemMiddleware          (provides ls/read/write/edit/glob/grep/execute)
 4. SubAgentMiddleware            (provides task tool)
 5. SummarizationMiddleware       (auto context compaction)
 6. PatchToolCallsMiddleware      (fixes dangling tool calls)
 7. AsyncSubAgentMiddleware       (if async subagents)
 --- user middleware inserted here ---
 8. Profile extra_middleware      (provider-specific)
 9. ToolExclusionMiddleware       (if profile excludes tools)
10. AnthropicPromptCachingMiddleware
11. MemoryMiddleware              (if memory provided)
12. HumanInTheLoopMiddleware      (if interrupt_on provided)
13. PermissionMiddleware          (ALWAYS LAST)
```

### Custom middleware hooks

```python
class MyMiddleware(AgentMiddleware):
    def before_agent(self, state, runtime): ...      # once at start
    def before_model(self, state, runtime): ...      # before each LLM call
    def wrap_model_call(self, request, handler): ...  # intercept LLM call
    def after_model(self, state, runtime): ...       # after each LLM call
    def wrap_tool_call(self, request, handler): ...   # intercept tool execution
    def after_agent(self, state, runtime): ...       # once at end
```

## 8. Streaming

```python
# Token-level streaming
async for chunk in agent.astream(input, config, stream_mode="messages", version="v2"):
    print(chunk["data"][0].content, end="")

# Node-level updates
async for chunk in agent.astream(input, config, stream_mode="updates", version="v2"):
    print(f"Node {chunk['ns']}: {chunk['data']}")

# Multiple modes
stream_mode=["messages", "updates", "custom"]
```

Subgraph streaming with `subgraphs=True`.

## 9. Checkpointers

| Checkpointer                     | Use case                   | Persistence |
| -------------------------------- | -------------------------- | ----------- |
| `MemorySaver`                    | Dev/testing                | RAM only    |
| `PersistentDict` + `MemorySaver` | Local dev with persistence | File-backed |
| `AsyncPostgresSaver`             | Production                 | Database    |

## 10. Existing Skills to Replicate

### Pipeline chain: tutorial-generator → director → sound-engineer → render

| Skill                  | Role                                | Human gate?       | Key behavior                                      |
| ---------------------- | ----------------------------------- | ----------------- | ------------------------------------------------- |
| **tutorial-generator** | Research + copy + escaleta + config | YES (escaleta)    | 8-step pipeline, parallel research, demo subagent |
| **short-ld**           | Product research + copy + escaleta  | YES (escaleta)    | Web scraping lineadirecta.com, brand rules        |
| **director**           | Editorial pass: timing, beats, sync | NO (automated)    | Diagnose→prescribe, music-aware pauses            |
| **sound-engineer**     | Music bed + SFX + ducking           | YES (sound chart) | Tone→tag mapping, scene→SFX defaults              |
| **best-practices**     | 37 Remotion rules                   | N/A (knowledge)   | Animation model, component mandates               |

### Key rules from best-practices (always in context)

- ALL animations: `useCurrentFrame()` + `spring()`/`interpolate()` — NO CSS transitions
- Images: `<Img>` from remotion — NO native `<img>`
- Assets: `staticFile()` — NO direct paths
- Colors: `useThemeTokens()` — NO hardcoded hex
- Slide-in: `useSlideIn()` hook — NO custom spring boilerplate

## 11. Architecture Gaps Identified

1. **Shared code trapped in ClaudeCodeTutorial** — themes, PhoneMascot, useSlideIn, KaraokeSubtitles should be in `src/shared/`
2. **80+ lines audio/SFX/voiceover duplicated** between compositions
3. **Agent only knows 9 scenes** — 26 custom scenes invisible to the agent
4. **Pipeline is only copywriter→render** — missing director + sound-engineer nodes
5. **No scene catalog** — agent can't use or create custom scenes
6. **No streaming** — blocking request-response, no real-time progress
