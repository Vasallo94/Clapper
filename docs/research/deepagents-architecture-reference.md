# DeepAgents Architecture Reference

> Research date: 2026-04-20
> Sources: LangChain official documentation (docs.langchain.com/oss/python/deepagents/\*)
> Purpose: Foundation document for architecture design decisions

---

## 1. Overview

DeepAgents is a standalone **agent harness** library built atop LangChain's core components. It combines LangGraph's runtime with built-in tools to enable agents capable of planning, subagent delegation, and filesystem-based complex task execution.

The repository ships three components:

- **Deep Agents SDK** — the agent building package (`deepagents`)
- **Deep Agents CLI** — terminal coding agent
- **ACP integration** — Agent Client Protocol connector for editors (e.g., Zed)

**Installation:**

```bash
uv add deepagents
```

---

## 2. create_deep_agent() — Full Parameter Reference

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model,              # str | BaseChatModel | None
    tools,              # Sequence[BaseTool | Callable | dict]
    system_prompt,      # str | SystemMessage | None
    middleware,          # Sequence[AgentMiddleware]
    subagents,           # Sequence[SubAgent | CompiledSubAgent | AsyncSubAgent]
    skills,              # list[str]
    memory,              # list[str]
    response_format,     # Pydantic model / ResponseFormat
    backend,             # BackendProtocol | BackendFactory
    interrupt_on,        # dict[str, bool | InterruptOnConfig]
    checkpointer,        # BaseCheckpointSaver (e.g., MemorySaver)
    store,               # BaseStore (e.g., InMemoryStore)
    permissions,         # list[FilesystemPermission]
    name,                # str (agent name for tracing metadata)
    context_schema,      # dataclass type for runtime context
)
```

### Parameter Details

| Parameter         | Type                                                      | Default                         | Description                                                                                        |
| ----------------- | --------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `model`           | `str \| BaseChatModel \| None`                            | `"anthropic:claude-sonnet-4-6"` | Model identifier in `"provider:model"` format, or a pre-initialized LangChain chat model instance. |
| `tools`           | `Sequence[BaseTool \| Callable \| dict]`                  | `[]`                            | Custom tools (Python callables with type hints and docstrings). Added alongside built-in tools.    |
| `system_prompt`   | `str \| SystemMessage \| None`                            | Built-in default                | Overrides default system instructions. Middleware may append additional instructions.              |
| `middleware`      | `Sequence[AgentMiddleware]`                               | See default stack below         | Custom middleware sequence. Replaces defaults when specified.                                      |
| `subagents`       | `Sequence[SubAgent \| CompiledSubAgent \| AsyncSubAgent]` | `[]`                            | Specialized agents for delegated tasks. A `"general-purpose"` subagent is always auto-created.     |
| `skills`          | `list[str]`                                               | `None`                          | Filesystem paths to skill directories (e.g., `["/skills/"]`). Enables SkillsMiddleware.            |
| `memory`          | `list[str]`                                               | `None`                          | Filesystem paths to memory files (e.g., `["/memories/AGENTS.md"]`). Enables MemoryMiddleware.      |
| `response_format` | `type[BaseModel]`                                         | `None`                          | Pydantic model for structured output. Result appears in state under `"structured_response"`.       |
| `backend`         | `BackendProtocol \| BackendFactory`                       | `StateBackend()`                | Virtual filesystem backend. Controls how file tools read/write data.                               |
| `interrupt_on`    | `dict[str, bool \| InterruptOnConfig]`                    | `None`                          | Per-tool interrupt configuration. Enables HumanInTheLoopMiddleware. Requires `checkpointer`.       |
| `checkpointer`    | `BaseCheckpointSaver`                                     | `None`                          | State persistence between invocations. **Required** for human-in-the-loop and thread continuity.   |
| `store`           | `BaseStore`                                               | `None`                          | Cross-thread durable storage. Omit when deploying to LangSmith (auto-provisioned).                 |
| `permissions`     | `list[FilesystemPermission]`                              | `None`                          | Declarative file access rules. First-match-wins evaluation.                                        |
| `name`            | `str`                                                     | `None`                          | Agent identifier. Appears as `lc_agent_name` in streaming metadata and traces.                     |
| `context_schema`  | `dataclass`                                               | `None`                          | Typed context object passed to tools via `ToolRuntime`. Propagated to subagents.                   |

### Supported Model Providers

Format: `"provider:model-name"`

| Provider       | Example Models                                       | Env Variable         |
| -------------- | ---------------------------------------------------- | -------------------- |
| `anthropic`    | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 | `ANTHROPIC_API_KEY`  |
| `openai`       | gpt-5.4, gpt-4o, o4-mini, o3                         | `OPENAI_API_KEY`     |
| `google_genai` | gemini-3.1-pro-preview, gemini-3-flash-preview       | `GOOGLE_API_KEY`     |
| `openrouter`   | Various                                              | `OPENROUTER_API_KEY` |
| `fireworks`    | Various                                              | `FIREWORKS_API_KEY`  |
| `baseten`      | Various                                              | `BASETEN_API_KEY`    |
| `ollama`       | Local models                                         | `OLLAMA_API_KEY`     |
| `azure`        | Azure-hosted models                                  | Azure credentials    |
| `bedrock`      | AWS-hosted models                                    | AWS credentials      |

Models can also be initialized directly via `init_chat_model()` or provider-specific classes for advanced configuration (retries, timeouts, thinking level):

```python
from langchain.chat_models import init_chat_model

model = init_chat_model(
    model="google_genai:gemini-3.1-pro-preview",
    max_retries=10,
    timeout=120,
    thinking_level="medium",
)
```

### Invocation Pattern

```python
from langchain_core.utils.uuid import uuid7

config = {"configurable": {"thread_id": str(uuid7())}}

result = agent.invoke(
    {"messages": [{"role": "user", "content": "Your prompt"}]},
    config=config,
    version="v2",
)

# Access result
print(result["messages"][-1].content)

# With StateBackend, seed files:
result = agent.invoke(
    {
        "messages": [{"role": "user", "content": "..."}],
        "files": {"/path/file.md": create_file_data("content")}
    },
    config=config,
)
```

---

## 3. Built-in Tools

Deep Agents automatically equip agents with filesystem and planning tools. These are injected by the default middleware stack.

### Planning Tool

| Tool          | Provided by        | Description                                                                                                      |
| ------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `write_todos` | TodoListMiddleware | Task decomposition and planning. Agent breaks complex requests into structured todo lists stored in agent state. |

### Filesystem Tools

| Tool         | Provided by          | Description                                                                                                                     |
| ------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ls`         | FilesystemMiddleware | List directory entries. Returns `path`, `is_dir`, `size`, `modified_at`.                                                        |
| `read_file`  | FilesystemMiddleware | Read file content. Supports `offset` (default 0) and `limit` (default 2000 lines).                                              |
| `write_file` | FilesystemMiddleware | Create-only file writing. Returns error on conflict (file already exists).                                                      |
| `edit_file`  | FilesystemMiddleware | Edit existing files via `old_string` / `new_string` replacement. Enforces uniqueness of `old_string` unless `replace_all=True`. |
| `glob`       | FilesystemMiddleware | Pattern matching against file paths. Supports `**` recursive matching.                                                          |
| `grep`       | FilesystemMiddleware | Search file contents by regex pattern. Supports path and glob filtering. Returns structured matches.                            |

### Execution Tool

| Tool      | Provided by                           | Description                                                                                                                                       |
| --------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `execute` | LocalShellBackend or Sandbox backends | Shell command execution. Only available when backend supports it. Configurable `timeout` (default 120s) and `max_output_bytes` (default 100,000). |

### Delegation Tool

| Tool   | Provided by        | Description                                                                                                                                          |
| ------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task` | SubAgentMiddleware | Dispatches work to subagents. Parameters: `name` (subagent identifier), `task` (work description). Returns subagent's final response as ToolMessage. |

### Async Delegation Tools

| Tool                | Provided by             | Description                                          |
| ------------------- | ----------------------- | ---------------------------------------------------- |
| `start_async_task`  | AsyncSubAgentMiddleware | Launch background task, returns task ID immediately. |
| `check_async_task`  | AsyncSubAgentMiddleware | Retrieve status and results of a background task.    |
| `update_async_task` | AsyncSubAgentMiddleware | Send follow-up instructions to a running task.       |
| `cancel_async_task` | AsyncSubAgentMiddleware | Stop a running background task.                      |
| `list_async_tasks`  | AsyncSubAgentMiddleware | List all tracked tasks with live statuses.           |

### Tool Disabling

Tools are injected by middleware. To disable specific tools:

- **Remove the middleware** that provides them (e.g., remove `FilesystemMiddleware` to eliminate all filesystem tools).
- **Use permissions** to restrict operations without removing tools entirely.
- **Override the middleware list** via the `middleware` parameter to include only desired middleware.

---

## 4. SubAgent System

### 4.1 SubAgent (Dictionary-Based, Synchronous)

The primary subagent type. Defined as a dictionary or TypedDict. The supervisor **blocks** until the subagent completes.

```python
research_subagent = {
    "name": "research-agent",
    "description": "Analyzes financial data and generates investment insights with confidence scores",
    "system_prompt": "You are a great researcher. Keep response under 500 words.",
    "tools": [internet_search],
    "model": "openai:gpt-5.2",  # Optional override
}

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    subagents=[research_subagent],
)
```

**Fields:**

| Field             | Type                         | Required | Inheritance                                   |
| ----------------- | ---------------------------- | -------- | --------------------------------------------- |
| `name`            | `str`                        | Yes      | N/A                                           |
| `description`     | `str`                        | Yes      | N/A                                           |
| `system_prompt`   | `str`                        | Yes      | Never inherits from parent                    |
| `tools`           | `list[Callable]`             | No       | Replaces parent tools entirely when specified |
| `model`           | `str \| BaseChatModel`       | No       | Inherits parent model if omitted              |
| `middleware`      | `list[Middleware]`           | No       | Does not inherit                              |
| `interrupt_on`    | `dict[str, bool]`            | No       | Can override parent config                    |
| `skills`          | `list[str]`                  | No       | Only general-purpose subagent inherits        |
| `response_format` | `ResponseFormat`             | No       | N/A                                           |
| `permissions`     | `list[FilesystemPermission]` | No       | Inherits parent unless specified              |

### 4.2 CompiledSubAgent (Graph-Based)

For complex workflows using prebuilt LangGraph graphs:

```python
from deepagents import CompiledSubAgent
from langchain.agents import create_agent

custom_graph = create_agent(
    model=your_model,
    tools=specialized_tools,
    prompt="You are a specialized agent..."
)

custom_subagent = CompiledSubAgent(
    name="data-analyzer",
    description="Complex data analysis tasks",
    runnable=custom_graph,  # Must have "messages" state key
)
```

**Fields:**

- `name` (str) — Required identifier
- `description` (str) — Required task description
- `runnable` (Runnable) — Required compiled LangGraph graph with `"messages"` in state

### 4.3 AsyncSubAgent (Non-Blocking)

Returns a job ID immediately; the supervisor continues working. Subagent runs in background.

```python
from deepagents import AsyncSubAgent

async_subagents = [
    # ASGI transport (co-deployed, in-process)
    AsyncSubAgent(
        name="researcher",
        description="Research agent for information gathering",
        graph_id="researcher",
    ),
    # HTTP transport (remote deployment)
    AsyncSubAgent(
        name="coder",
        description="Coding agent",
        graph_id="coder",
        url="https://coder-deployment.langsmith.dev",
        headers={"Authorization": "Bearer ..."},
    ),
]
```

**Fields:**

- `name` (str) — Required unique identifier
- `description` (str) — Required, guides supervisor delegation
- `graph_id` (str) — Required, Agent Protocol server graph identifier
- `url` (str) — Optional, remote HTTP endpoint (omit for ASGI co-deployment)
- `headers` (dict) — Optional, custom authentication headers

**Key differences from SubAgent:**

- Non-blocking: returns task ID immediately
- Stateful: maintains own thread across interactions
- Steerable: supervisor can send follow-up instructions mid-flight via `update_async_task`
- Cancellable: via `cancel_async_task`

### 4.4 The `task` Tool — Dispatch Mechanism

The `task()` tool is injected by `SubAgentMiddleware`. When the main agent calls it:

1. Main agent invokes `task(name="research-agent", task="Research quantum computing trends")`
2. SubAgentMiddleware creates a fresh agent instance with the subagent's config
3. The subagent executes all internal tool calls independently
4. Only the **final result** is returned to the parent's context as a `ToolMessage`
5. This prevents context bloat — intermediate tool calls stay inside the subagent

### 4.5 General-Purpose Subagent

All Deep Agents automatically include a `"general-purpose"` subagent that:

- Inherits the main agent's system prompt
- Has access to all main agent tools
- Uses the main agent's model
- Inherits skills (when configured)

Override by providing a custom subagent with `name="general-purpose"`. This fully replaces the default.

### 4.6 Context Propagation

Runtime context automatically flows from parent to all subagents:

```python
from dataclasses import dataclass
from langchain.tools import tool, ToolRuntime

@dataclass
class Context:
    user_id: str
    session_id: str

@tool
def get_user_data(query: str, runtime: ToolRuntime[Context]) -> str:
    user_id = runtime.context.user_id
    return f"Data for user {user_id}: {query}"

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    context_schema=Context,
    subagents=[{
        "name": "researcher",
        "description": "Researches for current user",
        "system_prompt": "You are a research assistant.",
        "tools": [get_user_data],
    }],
)

result = await agent.invoke(
    {"messages": [HumanMessage("Look up my activity")]},
    context=Context(user_id="user-123", session_id="abc"),
)
```

**Identifying the caller:** Access `runtime.config.get("metadata", {}).get("lc_agent_name")` in shared tools to determine which agent initiated the call.

### 4.7 Structured Output from Subagents

```python
from pydantic import BaseModel, Field

class ResearchFindings(BaseModel):
    summary: str = Field(description="Summary of findings")
    confidence: float = Field(description="Confidence 0-1")
    sources: list[str] = Field(description="Source URLs")

research_subagent = {
    "name": "researcher",
    "description": "Returns structured findings",
    "system_prompt": "Research thoroughly. Return findings.",
    "tools": [web_search],
    "response_format": ResearchFindings,
}
```

Parent receives JSON-serialized result as `ToolMessage` content.

---

## 5. Middleware System

### 5.1 Default Middleware Stack

When no `middleware` parameter is provided, the following are enabled:

| Middleware                       | Always Active | Condition                                                             |
| -------------------------------- | ------------- | --------------------------------------------------------------------- |
| TodoListMiddleware               | Yes           | Provides `write_todos` tool                                           |
| FilesystemMiddleware             | Yes           | Provides `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep` |
| SubAgentMiddleware               | Yes           | Provides `task` tool                                                  |
| SummarizationMiddleware          | Yes           | Auto-summarizes conversation when approaching token limits            |
| AnthropicPromptCachingMiddleware | Yes           | Optimizes token usage for Anthropic models                            |
| PatchToolCallsMiddleware         | Yes           | Normalizes tool call formats                                          |
| MemoryMiddleware                 | Conditional   | Enabled when `memory` argument provided                               |
| SkillsMiddleware                 | Conditional   | Enabled when `skills` argument provided                               |
| HumanInTheLoopMiddleware         | Conditional   | Enabled when `interrupt_on` argument provided                         |

### 5.2 Available Middleware Types

#### Core Control

- **SummarizationMiddleware** — Auto-summarizes conversation history when approaching token limits while preserving recent messages.
- **ModelCallLimitMiddleware** — Prevents runaway agents via `thread_limit` and `run_limit` parameters.
- **ToolCallLimitMiddleware** — Controls tool execution with global or per-tool constraints.
- **ModelFallbackMiddleware** — Automatically attempts alternate models on failure.

#### Human-Centered

- **HumanInTheLoopMiddleware** — Pauses execution for human approval of tool calls (requires checkpointer).
- **TodoListMiddleware** — Provides `write_todos` tool and injects planning system prompts.

#### Resilience and Optimization

- **ToolRetryMiddleware** — Retries failed tool calls with exponential backoff (configurable).
- **ModelRetryMiddleware** — Similar retry pattern for model API calls.
- **LLMToolSelectorMiddleware** — Uses structured output to filter relevant tools before main model execution.
- **LLMToolEmulator** — Emulates tool execution using an LLM for testing purposes.
- **ContextEditingMiddleware** — Clears older tool outputs while preserving recent results.

#### Security and Data Handling

- **PIIMiddleware** — Detects PII with built-in types (`email`, `credit_card`, `ip`) or custom detectors.
  - Strategies: `'block'`, `'redact'`, `'mask'`, `'hash'`
  - Supports regex patterns or custom detector functions

#### System Integration

- **ShellToolMiddleware** — Exposes persistent shell sessions with execution policies:
  - `HostExecutionPolicy` (default, no isolation)
  - `DockerExecutionPolicy` (isolated containers)
  - `CodexSandboxExecutionPolicy` (syscall restrictions)
- **FilesystemFileSearchMiddleware** — Provides glob and grep tools for filesystem search.
- **FilesystemMiddleware** — Four core tools: `ls`, `read_file`, `write_file`, `edit_file`.
- **SubAgentMiddleware** — Spawns subagents for context isolation via `task` tool.
- **AsyncSubAgentMiddleware** — Manages async subagent lifecycle (5 tools).

### 5.3 Trigger Conditions (ContextSize)

Middleware that monitor context window use `ContextSize` tuples with three formats:

```python
# Absolute token count
trigger=[("tokens", 4000)]

# Message count
trigger=[("messages", 20)]

# Fraction of model context window
trigger=[("fraction", 0.8)]

# Multiple triggers (OR logic)
trigger=[("tokens", 3000), ("messages", 6)]
```

### 5.4 Custom Middleware

The documentation references a `@wrap_tool_call` decorator for intercepting tool calls, and a `@wrap_model_call` decorator for intercepting/swapping model calls at runtime.

**Critical constraint:** Never mutate middleware instance attributes. Update graph state instead to avoid race conditions with concurrent operations.

### 5.5 PII Middleware — Custom Detectors

```python
# Regex string
PIIMiddleware("api_key", detector=r"sk-[a-zA-Z0-9]{32}")

# Compiled regex
PIIMiddleware("phone", detector=re.compile(r"\+?\d{1,3}[\s.-]?\d{4}"))

# Custom function
def detect_ssn(content: str) -> list[dict[str, str | int]]:
    return [{"text": match, "start": start, "end": end}]
PIIMiddleware("ssn", detector=detect_ssn)
```

---

## 6. Skills System

### 6.1 Concept

Skills are a **progressive-disclosure** system providing task-specific expertise via markdown files. They load only when relevant, reducing token overhead compared to stuffing everything into the system prompt.

### 6.2 Directory Structure

```
skills/
├── langgraph-docs/
│   └── SKILL.md
└── arxiv_search/
    ├── SKILL.md
    └── arxiv_search.py
```

Each skill folder contains a `SKILL.md` file (mandatory, max 10 MB) with YAML frontmatter and instructions, plus optional supporting files.

### 6.3 SKILL.md Format

```markdown
---
name: langgraph-docs
description: Fetch LangGraph documentation for accurate guidance
license: MIT
compatibility: Requires internet access
metadata:
  author: langchain
  version: "1.0"
allowed-tools: fetch_url
---

# langgraph-docs

## Overview

Access LangGraph documentation to answer questions.

## Instructions

### 1. Fetch Documentation Index

Use fetch_url: https://docs.langchain.com/llms.txt

### 2. Select Relevant Documentation

Choose 2-4 most relevant URLs.

### 3. Fetch Selected Documentation

Use fetch_url for each selected URL.

### 4. Provide Guidance

Complete the user's request after reading docs.
```

**Key constraints:**

- `description` field is critical — agent matches skills based on description alone
- Description truncated to 1,024 characters
- Files over 10 MB are skipped

### 6.4 Three-Phase Matching (Progressive Disclosure)

1. **Match Phase** — Agent reviews frontmatter descriptions from all available skills
2. **Read Phase** — If matched, agent reads the complete `SKILL.md` file
3. **Execute Phase** — Agent follows instructions and accesses supporting files

A "Skills System" section is automatically injected into the system prompt when skills are configured.

### 6.5 Configuration

```python
agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    skills=["/skills/user/", "/skills/project/"],
    backend=FilesystemBackend(root_dir="/path/to/project"),
)
```

- **Later sources override earlier ones** (last wins)
- With `StateBackend`, seed skills via `invoke(files={...})`
- With `StoreBackend`, pre-populate store with `store.put()` calls
- With `FilesystemBackend`, skills load from disk directly
- Subagent skills are fully isolated from parent skills

### 6.6 Skills vs. Memory vs. Tools

| Aspect   | Skills                            | Memory                              | Tools                |
| -------- | --------------------------------- | ----------------------------------- | -------------------- |
| Loading  | On-demand, progressive disclosure | Always loaded at startup            | Function calls       |
| Format   | `SKILL.md` files                  | `AGENTS.md` files                   | Function definitions |
| Use case | Large, task-specific contexts     | Always-relevant project conventions | Direct API access    |

---

## 7. Memory System

### 7.1 Concept

Memory enables **cross-thread persistence** through filesystem-backed storage. Memory files transcend thread boundaries, creating continuity across separate conversations.

### 7.2 AGENTS.md Pattern

The canonical memory file is `AGENTS.md`, containing:

- Response style preferences
- Communication guidelines
- Agent persona documentation
- Learned user preferences

### 7.3 Lifecycle

When `memory=["/memories/AGENTS.md"]` is configured:

1. **Loaded at agent startup** into the system prompt
2. **Readable/writable during conversation** via `edit_file` tool
3. **Persisted to the backend** (InMemoryStore, LangSmith platform store, etc.)
4. **Accessible to subsequent threads** of the same agent instance

### 7.4 Namespace Factories (Data Isolation)

The namespace determines which threads share which memory files:

```python
from deepagents.backends import StoreBackend

# Agent-scoped (shared across all users)
StoreBackend(namespace=lambda rt: (rt.server_info.assistant_id,))

# User-scoped (isolated per user)
StoreBackend(namespace=lambda rt: (rt.server_info.user.identity,))

# Multi-dimensional (per-agent, per-user)
StoreBackend(namespace=lambda rt: (rt.server_info.assistant_id, rt.server_info.user.identity))
```

Namespace tuple components must contain alphanumeric chars, hyphens, underscores, dots, `@`, `+`, colons, tildes.

### 7.5 LangGraph Store Integration

```python
from langgraph.store.memory import InMemoryStore
from deepagents.backends.utils import create_file_data

store = InMemoryStore()
store.put(
    ("my-agent",),                    # namespace tuple
    "/memories/AGENTS.md",            # path key
    create_file_data("# Agent Memory\n- User prefers concise answers")
)

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    backend=StoreBackend(),
    store=store,
    memory=["/memories/AGENTS.md"],
)
```

### 7.6 Update Strategies

- **In-conversation**: Agent writes memory updates during the current session (default)
- **Background consolidation**: A separate agent reviews conversations asynchronously and merges learnings between sessions (higher quality, no user-facing latency)

### 7.7 Permissions on Memory

Memory files can be:

- **Read-write**: For user preferences, self-improvement
- **Read-only**: For organization policies, developer-defined skills (prevents prompt injection via shared state)

---

## 8. Interrupt / Checkpoint Mechanism

### 8.1 interrupt_on Configuration

```python
interrupt_on = {
    "delete_file": True,                                        # Default decisions: approve, edit, reject
    "read_file": False,                                         # No interrupts
    "send_email": {"allowed_decisions": ["approve", "reject"]}, # Custom decisions
    "critical_op": {"allowed_decisions": ["approve"]},          # Approve-only
}
```

**Decision types:**

- `"approve"` — Execute with original agent-proposed arguments
- `"edit"` — Modify tool arguments before execution
- `"reject"` — Skip tool execution entirely

### 8.2 Checkpointer Requirement

A checkpointer is **mandatory** for human-in-the-loop. It persists state between the interrupt and the resume:

```python
from langgraph.checkpoint.memory import MemorySaver

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    interrupt_on={"delete_file": True},
    checkpointer=MemorySaver(),
)
```

### 8.3 Interrupt Detection and Inspection

```python
config = {"configurable": {"thread_id": str(uuid7())}}

result = agent.invoke(
    {"messages": [{"role": "user", "content": "Delete temp.txt"}]},
    config=config,
    version="v2",
)

if result.interrupts:
    interrupt_value = result.interrupts[0].value
    action_requests = interrupt_value["action_requests"]   # Pending tool calls
    review_configs = interrupt_value["review_configs"]      # Allowed decisions per action
```

### 8.4 Resuming Execution

Resume with `Command(resume=...)` using the **same config and thread ID**:

```python
from langgraph.types import Command

# Simple approve
result = agent.invoke(
    Command(resume={"decisions": [{"type": "approve"}]}),
    config=config,
    version="v2",
)

# Edit arguments
result = agent.invoke(
    Command(resume={"decisions": [{
        "type": "edit",
        "edited_action": {
            "name": action_request["name"],
            "args": {"to": "team@company.com", "subject": "...", "body": "..."}
        }
    }]}),
    config=config,
    version="v2",
)

# Multiple tool calls — one decision per action, in order
result = agent.invoke(
    Command(resume={"decisions": [
        {"type": "approve"},    # First tool
        {"type": "reject"},     # Second tool
    ]}),
    config=config,
    version="v2",
)
```

### 8.5 interrupt() Primitive — Direct Control

Subagent tools can call `interrupt()` directly for custom approval workflows:

```python
from langgraph.types import interrupt

@tool
def request_approval(action_description: str) -> str:
    """Request human approval using the interrupt() primitive."""
    approval = interrupt({
        "type": "approval_request",
        "action": action_description,
        "message": f"Please approve or reject: {action_description}",
    })
    if approval.get("approved"):
        return f"Action '{action_description}' was APPROVED"
    else:
        return f"Action '{action_description}' was REJECTED"
```

Resume with decision data:

```python
result = agent.invoke(
    Command(resume={"approved": True}),
    config=config,
    version="v2",
)
```

### 8.6 Subagent Interrupts

Subagents can override parent `interrupt_on` configurations:

```python
subagents=[{
    "name": "file-manager",
    "interrupt_on": {
        "delete_file": True,
        "read_file": True,    # Different from main agent
    }
}]
```

---

## 9. Backend / Sandbox System

### 9.1 BackendProtocol Interface

All backends must implement:

```python
class BackendProtocol:
    def ls(self, path: str) -> LsResult: ...
    def read(self, file_path: str, offset: int = 0, limit: int = 2000) -> ReadResult: ...
    def grep(self, pattern: str, path: str | None = None, glob: str | None = None) -> GrepResult: ...
    def glob(self, pattern: str, path: str = "/") -> GlobResult: ...
    def write(self, file_path: str, content: str) -> WriteResult: ...
    def edit(self, file_path: str, old_string: str, new_string: str, replace_all: bool = False) -> EditResult: ...
```

Return types include `FileInfo`, `FileData`, `GrepMatch`, plus result objects with `error` and data fields. Methods should return errors (not raise exceptions).

### 9.2 Built-in Backends

#### StateBackend (Default, Ephemeral)

- Stores files in LangGraph agent state for the current thread
- Persists across multiple agent turns via checkpoints
- Ideal for scratch pads and intermediate results
- No `execute` capability

#### FilesystemBackend (Local Disk)

- Reads/writes real files under configurable `root_dir`
- `virtual_mode=True` sandboxes paths and prevents directory traversal
- Development only
- No `execute` capability

#### LocalShellBackend (Local Shell)

- Extends FilesystemBackend with `execute` tool
- `subprocess.run(shell=True)` with **no sandboxing**
- Configurable: `timeout` (default 120s), `max_output_bytes` (default 100,000), `env`, `inherit_env`
- Development only — extreme caution

#### StoreBackend (LangGraph Store)

- Cross-thread durable storage via `BaseStore`
- Namespace factories for data isolation
- Production-ready for memory and skills

```python
StoreBackend(namespace=lambda rt: (rt.server_info.user.identity,))
```

#### CompositeBackend (Router)

- Routes operations to different backends by path prefix
- Longer prefixes win for routing priority

```python
CompositeBackend(
    default=StateBackend(),
    routes={"/memories/": StoreBackend()}
)
```

### 9.3 Sandbox Backends

Provide filesystem tools **plus** `execute` tool in isolated environments.

**Supported providers:**

- **Modal** — Remote compute platform
- **Daytona** — Development environment provider
- **Runloop** — DevBox creation service
- **AgentCore** — AWS Bedrock code interpreter
- **LangSmith** — Private beta sandbox

**Architecture:** All sandbox backends implement a single `execute()` method. Every other filesystem operation (`ls`, `read`, `write`, etc.) is built on top of `execute()` by the `BaseSandbox` base class, which constructs scripts and runs them inside the sandbox.

**Isolation model:**

- Prevents access to host files, environment variables, and other processes
- Does NOT protect against context injection (attacker-controlled input can run arbitrary commands inside sandbox)
- Network exfiltration possible unless explicitly blocked by provider

**Lifecycle scoping:**

1. **Thread-scoped** (default) — Each conversation gets its own sandbox, cleaned up when thread ends
2. **Assistant-scoped** — All threads share one sandbox; persistent state across conversations
3. **Manual** — Explicit creation and destruction

**File transfer APIs** (separate from agent tools):

- `upload_files()` — Seed sandbox before agent runs
- `download_files()` — Retrieve artifacts after completion

**Security critical:** Never put secrets (API keys, tokens, credentials) inside a sandbox. They can be read and exfiltrated. Keep secrets in tools outside the sandbox.

### 9.4 API Migration Notes

- Factory pattern (`backend=` accepting callables) deprecated since v0.5.0 — pass pre-constructed instances
- `deepagents>=0.5.2` uses `Runtime` instead of `BackendContext` in namespace factories

---

## 10. Permissions System

### 10.1 FilesystemPermission Rules

```python
permissions = [
    FilesystemPermission(operations=["write"], paths=["/workspace/.env"], mode="deny"),
    FilesystemPermission(operations=["read", "write"], paths=["/workspace/**"], mode="allow"),
    FilesystemPermission(operations=["read", "write"], paths=["/**"], mode="deny"),
]
```

| Field        | Type                      | Description                                                                       |
| ------------ | ------------------------- | --------------------------------------------------------------------------------- |
| `operations` | `list["read" \| "write"]` | `"read"` covers ls, read_file, glob, grep; `"write"` covers write_file, edit_file |
| `paths`      | `list[str]`               | Glob patterns with `**` for recursive matching and `{a,b}` for alternatives       |
| `mode`       | `"allow" \| "deny"`       | Whether to permit or block (defaults to `"allow"`)                                |

### 10.2 Evaluation

- **First-match-wins** — Place specific rules before broader patterns
- **Default open** — If no rule matches, the operation is **permitted**
- **Subagent inheritance** — Subagents inherit parent permissions by default; setting `permissions` replaces entirely
- Custom tools and MCP tools **bypass** these restrictions
- Sandbox `execute` commands **bypass** path restrictions

### 10.3 Common Patterns

```python
# Read-only mode
[FilesystemPermission(operations=["write"], paths=["/**"], mode="deny")]

# Workspace isolation
[
    FilesystemPermission(operations=["read", "write"], paths=["/workspace/**"], mode="allow"),
    FilesystemPermission(operations=["read", "write"], paths=["/**"], mode="deny"),
]

# Protected files
[
    FilesystemPermission(operations=["read", "write"], paths=["/workspace/.env"], mode="deny"),
    FilesystemPermission(operations=["read", "write"], paths=["/workspace/**"], mode="allow"),
    FilesystemPermission(operations=["read", "write"], paths=["/**"], mode="deny"),
]

# Read-only memory
[
    FilesystemPermission(operations=["write"], paths=["/memories/**", "/policies/**"], mode="deny"),
    FilesystemPermission(operations=["read"], paths=["/memories/**", "/policies/**"], mode="allow"),
]
```

---

## 11. Context Management (Summarization)

The `SummarizationMiddleware` (enabled by default) automatically manages context window size:

- Triggers when conversation approaches token limits (configurable via `ContextSize` tuples)
- Summarizes older messages while preserving recent ones
- Maintains conversation continuity without manual intervention
- AsyncSubAgent task metadata persists in a separate `async_tasks` state channel, surviving message compaction

**Trigger configuration formats:**

- `("tokens", N)` — Absolute token count
- `("messages", N)` — Message count
- `("fraction", 0.8)` — Percentage of model's context window

---

## 12. Structured Output

Define response schemas using Pydantic models:

```python
from pydantic import BaseModel, Field

class Analysis(BaseModel):
    summary: str = Field(description="Brief summary")
    confidence: float = Field(description="Confidence score 0-1")
    recommendations: list[str] = Field(description="Action items")

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    response_format=Analysis,
)

result = agent.invoke(...)
structured = result["structured_response"]  # Analysis instance
```

---

## 13. Architecture Summary

```
                    create_deep_agent()
                           |
                    +------+------+
                    |             |
              Middleware     BackendProtocol
              Stack          (filesystem layer)
                    |             |
         +----+----+----+    +---+---+
         |    |    |    |    |       |
        Todo File Sub  Sum  State  Store  Sandbox
        List sys  Agent mar  Back   Back   Back
        MW   MW   MW   MW   end    end    end
                    |
              +-----+-----+
              |     |     |
           SubAgent Compiled Async
           (dict)   SubAgent SubAgent
```

**Data flow:**

1. User sends message via `invoke()` / `ainvoke()`
2. Middleware stack processes the request (injects system prompts, manages context)
3. Model generates response, potentially including tool calls
4. Tool calls route through middleware (interrupts, retries, PII checks)
5. Built-in tools interact with BackendProtocol for filesystem operations
6. `task` tool delegates to subagents (synchronous or async)
7. Results aggregate back through middleware stack
8. Final response returned to caller

**Key design principles:**

- Model-agnostic (any provider with tool calling support)
- Backend-agnostic (swap storage/execution without changing agent logic)
- Progressive disclosure (skills, summarization reduce token overhead)
- Isolation by default (subagents get clean context, sandboxes isolate execution)
