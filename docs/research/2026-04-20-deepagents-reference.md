# DeepAgents SDK -- Complete Reference

> Source: https://docs.langchain.com/oss/python/deepagents/
> Fetched: 2026-04-20 (updated 2026-05-04)
> Pages researched: overview, quickstart, customization, models, backends, sandboxes, permissions, human-in-the-loop, skills, subagents, memory, middleware, context-engineering

---

## 1. Overview

DeepAgents is a standalone library built on LangChain's agent building blocks, using LangGraph runtime for durable execution, streaming, and human-in-the-loop. The repository ships three artifacts:

- **DeepAgents SDK** -- agent building package
- **DeepAgents CLI** -- terminal coding agent
- **ACP integration** -- Agent Client Protocol connector for code editors

### 1.1 Core Capabilities (11)

| #   | Capability                    | Description                                                                                                                        |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Planning & task decomposition | Built-in `write_todos` tool for breaking complex tasks into steps with progress tracking                                           |
| 2   | Context management            | File system tools (`ls`, `read_file`, `write_file`, `edit_file`) offload large context; auto-summarization compacts older messages |
| 3   | Shell execution               | `execute` tool via sandbox backends for tests, builds, git, system tasks                                                           |
| 4   | Pluggable filesystem backends | In-memory, local disk, LangGraph store, sandboxes (Modal, Daytona, Deno), custom                                                   |
| 5   | Subagent spawning             | `task` tool spawns specialized subagents for context isolation                                                                     |
| 6   | Long-term memory              | Persistent memory across threads via LangGraph Memory Store                                                                        |
| 7   | Filesystem permissions        | Declarative rules controlling read/write access, inheritable by subagents                                                          |
| 8   | Human-in-the-loop             | Human approval for sensitive tool operations via LangGraph interrupt                                                               |
| 9   | Skills                        | Reusable capabilities providing workflows, domain knowledge, custom instructions                                                   |
| 10  | Smart defaults                | Opinionated system prompts teaching planning-before-acting, verification, context management                                       |
| 11  | Provider agnostic             | Works with any tool-calling model across providers                                                                                 |

### 1.2 When to Use DeepAgents vs. Simpler Alternatives

Use DeepAgents when you need:

- Complex multi-step tasks requiring planning/decomposition
- Large context management via filesystem tools and summarization
- Swappable filesystem backends
- Shell command execution via sandboxes
- Subagent delegation
- Persistent memory across conversations/threads
- Declarative filesystem permission rules
- Human approval for sensitive operations

For simpler agents, use LangChain's `create_agent` or custom LangGraph workflows.

### 1.3 Primary API: `create_deep_agent`

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    tools=[my_tool],
    system_prompt="You are a helpful assistant",
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "Hello"}]}
)
```

---

## 2. Models

### 2.1 Supported Models

| Provider    | Models                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Google      | `gemini-3.1-pro-preview`, `gemini-3-flash-preview`                                                                                       |
| OpenAI      | `gpt-5.4`, `gpt-4o`, `o4-mini`, `gpt-5.2-codex`, `gpt-4o-mini`, `o3`                                                                     |
| Anthropic   | `claude-opus-4-6`, `claude-opus-4-5`, `claude-sonnet-4-6`, `claude-sonnet-4`, `claude-sonnet-4-5`, `claude-haiku-4-5`, `claude-opus-4-1` |
| Open-weight | `GLM-5`, `Kimi-K2.5`, `MiniMax-M2.5`, `qwen3.5-397B-A17B`, `devstral-2-123B`                                                             |

Open-weight models available via Baseten, Fireworks, OpenRouter, and Ollama.

### 2.2 Model Format

Provider:model string format, e.g. `"anthropic:claude-sonnet-4-6"`.

### 2.3 Configuration Methods

**Method 1: String shorthand (default)**

```python
agent = create_deep_agent(model="anthropic:claude-sonnet-4-6")
```

**Method 2: `init_chat_model` with advanced params**

```python
from langchain.chat_models import init_chat_model

model = init_chat_model(
    model="google_genai:gemini-3.1-pro-preview",
    thinking_level="medium",
)
agent = create_deep_agent(model=model)
```

**Method 3: Direct provider class**

```python
from langchain_google_genai import ChatGoogleGenerativeAI

model = ChatGoogleGenerativeAI(
    model="gemini-3.1-pro-preview",
    thinking_level="medium",
)
agent = create_deep_agent(model=model)
```

### 2.4 Runtime Model Selection (via Middleware)

```python
from dataclasses import dataclass
from langchain.chat_models import init_chat_model
from langchain.agents.middleware import wrap_model_call, ModelRequest, ModelResponse
from deepagents import create_deep_agent
from typing import Callable

@dataclass
class Context:
    model: str

@wrap_model_call
def configurable_model(
    request: ModelRequest,
    handler: Callable[[ModelRequest], ModelResponse],
) -> ModelResponse:
    model_name = request.runtime.context.model
    model = init_chat_model(model_name)
    return handler(request.override(model=model))

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    middleware=[configurable_model],
    context_schema=Context,
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "Hello!"}]},
    context=Context(model="openai:gpt-5.4"),
)
```

### 2.5 Connection Resilience

Models automatically retry up to 6 times for network errors, rate limits (429), and server errors (5xx). Adjustable via `max_retries` parameter.

---

## 3. Backends

Backends provide pluggable filesystem operations: `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`. Image files (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`) return as multimodal content blocks.

### 3.1 Backend Summary

| Backend               | Persistence                      | Use Case                                      |
| --------------------- | -------------------------------- | --------------------------------------------- |
| **StateBackend**      | Ephemeral (single thread)        | Scratch pad, intermediate results             |
| **FilesystemBackend** | Local disk under `root_dir`      | Local development, CI/CD                      |
| **LocalShellBackend** | Local disk + shell execution     | Development CLIs with code execution          |
| **StoreBackend**      | Cross-thread via LangGraph Store | Long-term memory, multi-execution persistence |
| **CompositeBackend**  | Routes to different backends     | Mixed ephemeral + persistent storage          |
| **Custom**            | User-implemented                 | S3, Postgres, or other datastores             |

### 3.2 StateBackend (Default)

Stores files in LangGraph agent state. Persists across agent turns on same thread. Shared between supervisor and subagents.

```python
from deepagents.backends import StateBackend
agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=StateBackend()
)
```

### 3.3 FilesystemBackend

Reads/writes real files under configurable `root_dir`.

```python
from deepagents.backends import FilesystemBackend
agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=FilesystemBackend(root_dir=".", virtual_mode=True)
)
```

Key parameters:

- `root_dir` -- absolute path for filesystem root
- `virtual_mode=True` -- sandboxes paths, prevents `..`, `~`, absolute path escapes

**Security warnings:**

- Agents can read secrets (API keys, credentials, `.env` files)
- Combined with network tools enables SSRF
- File modifications are permanent and irreversible
- Always use `virtual_mode=True`

### 3.4 LocalShellBackend

Extends FilesystemBackend with `execute` tool. `subprocess.run(shell=True)` with NO sandboxing.

```python
from deepagents.backends import LocalShellBackend
agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=LocalShellBackend(root_dir=".", env={"PATH": "/usr/bin:/bin"})
)
```

Parameters:

- `timeout` -- default 120s
- `max_output_bytes` -- default 100,000
- `env` -- environment variables
- `inherit_env` -- inherit parent process env

**CRITICAL:** Never use on shared/production systems. Use sandbox backends instead.

### 3.5 StoreBackend

Cross-thread durable storage via LangGraph `BaseStore`.

```python
from langgraph.store.memory import InMemoryStore
from deepagents.backends import StoreBackend

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=StoreBackend(
        namespace=lambda rt: (rt.server_info.user.identity,),
    ),
    store=InMemoryStore()
)
```

#### Namespace Factories

Signature: `Callable[[Runtime], tuple[str, ...]]`

Runtime provides:

- `rt.context` -- user-supplied context
- `rt.server_info` -- server metadata (assistant ID, graph ID, authenticated user)
- `rt.execution_info` -- execution identity (thread ID, run ID, checkpoint ID)

Common patterns:

```python
# Per-user isolation
namespace=lambda rt: (rt.server_info.user.identity,)

# Per-assistant (shared across users)
namespace=lambda rt: (rt.server_info.assistant_id,)

# Per-thread/conversation
namespace=lambda rt: (rt.execution_info.thread_id,)

# Combined: per-user per-conversation
namespace=lambda rt: (
    rt.server_info.user.identity,
    rt.execution_info.thread_id,
)
```

Namespace chars: alphanumeric, hyphens, underscores, dots, `@`, `+`, colons, tildes. Wildcards (`*`, `?`) rejected.

**IMPORTANT:** `namespace` parameter required in v0.5.0+. Without it, legacy default uses `assistant_id` causing all users to share storage.

### 3.6 CompositeBackend

Routes different filesystem paths to different backends.

```python
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
from langgraph.store.memory import InMemoryStore

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    backend=CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(
                namespace=lambda rt: (rt.server_info.user.identity,)
            ),
        }
    ),
    store=InMemoryStore()
)
```

Routing behavior:

- `/workspace/plan.md` --> default backend (StateBackend)
- `/memories/agent.md` --> routed backend (StoreBackend)
- `ls`, `glob`, `grep` aggregate results with original path prefixes preserved
- Longer prefixes override shorter ones

### 3.7 BackendProtocol

Required methods for custom backends:

```python
def ls(path: str) -> LsResult
def read(file_path: str, offset: int = 0, limit: int = 2000) -> ReadResult
def grep(pattern: str, path: Optional[str] = None, glob: Optional[str] = None) -> GrepResult
def glob(pattern: str, path: str = "/") -> GlobResult
def write(file_path: str, content: str) -> WriteResult
def edit(file_path: str, old_string: str, new_string: str, replace_all: bool = False) -> EditResult
```

Supporting types:

- `LsResult(error, entries)` -- entries is `list[FileInfo]`
- `ReadResult(error, file_data)` -- file_data is `FileData` dict
- `GrepResult(error, matches)` -- matches is `list[GrepMatch]`
- `GlobResult(error, matches)` -- matches is `list[FileInfo]`
- `WriteResult(error, path, files_update)`
- `EditResult(error, path, files_update, occurrences)`
- `FileInfo`: `path` (required), `is_dir`, `size`, `modified_at`
- `GrepMatch`: `path`, `line`, `text`
- `FileData`: `content` (str), `encoding` ("utf-8" or "base64"), `created_at`, `modified_at`

### 3.8 Custom Backend Example (S3)

```python
from deepagents.backends.protocol import (
    BackendProtocol, WriteResult, EditResult, LsResult,
    ReadResult, GrepResult, GlobResult,
)

class S3Backend(BackendProtocol):
    def __init__(self, bucket: str, prefix: str = ""):
        self.bucket = bucket
        self.prefix = prefix.rstrip("/")

    def _key(self, path: str) -> str:
        return f"{self.prefix}{path}"

    def ls(self, path: str) -> LsResult: ...
    def read(self, file_path: str, offset: int = 0, limit: int = 2000) -> ReadResult: ...
    def grep(self, pattern: str, path: str | None = None, glob: str | None = None) -> GrepResult: ...
    def glob(self, pattern: str, path: str = "/") -> GlobResult: ...
    def write(self, file_path: str, content: str) -> WriteResult: ...
    def edit(self, file_path: str, old_string: str, new_string: str, replace_all: bool = False) -> EditResult: ...
```

### 3.9 Policy Hooks (Custom Validation)

**Subclass approach:**

```python
class GuardedBackend(FilesystemBackend):
    def __init__(self, *, deny_prefixes: list[str], **kwargs):
        super().__init__(**kwargs)
        self.deny_prefixes = [p if p.endswith("/") else p + "/" for p in deny_prefixes]

    def write(self, file_path: str, content: str) -> WriteResult:
        if any(file_path.startswith(p) for p in self.deny_prefixes):
            return WriteResult(error=f"Writes not allowed under {file_path}")
        return super().write(file_path, content)

    def edit(self, file_path: str, old_string: str, new_string: str, replace_all: bool = False) -> EditResult:
        if any(file_path.startswith(p) for p in self.deny_prefixes):
            return EditResult(error=f"Edits not allowed under {file_path}")
        return super().edit(file_path, old_string, new_string, replace_all)
```

**Generic wrapper (PolicyWrapper):**

```python
class PolicyWrapper(BackendProtocol):
    def __init__(self, inner: BackendProtocol, deny_prefixes: list[str] | None = None):
        self.inner = inner
        self.deny_prefixes = [p if p.endswith("/") else p + "/" for p in (deny_prefixes or [])]

    def _deny(self, path: str) -> bool:
        return any(path.startswith(p) for p in self.deny_prefixes)

    # delegate all reads to inner, block writes on denied prefixes
```

### 3.10 Migration Notes (v0.5.0+)

| Before (deprecated)                   | After                                |
| ------------------------------------- | ------------------------------------ |
| `backend=lambda rt: StateBackend(rt)` | `backend=StateBackend()`             |
| `backend=lambda rt: StoreBackend(rt)` | `backend=StoreBackend()`             |
| `BackendContext` wrapper              | Direct LangGraph `Runtime` (v0.5.2+) |

---

## 4. Sandboxes

Sandboxes are backends that provide isolated execution environments for code, filesystem, and shell commands.

### 4.1 Providers

| Provider  | Package                               | Lifecycle                                                |
| --------- | ------------------------------------- | -------------------------------------------------------- |
| Modal     | `langchain-modal`                     | `modal.Sandbox.create()` / `.terminate()`                |
| Runloop   | `langchain-runloop`                   | `client.devbox.create()` / `.shutdown()`                 |
| Daytona   | `langchain-daytona`                   | `Daytona().create()` / `.stop()`                         |
| LangSmith | `langsmith[sandbox]` (private beta)   | `SandboxClient().create_sandbox()` / `.delete_sandbox()` |
| AgentCore | `langchain-agentcore-codeinterpreter` | `CodeInterpreter.start()` / `.stop()`                    |

### 4.2 Tool Set

When configured with a sandbox, agents receive:

- Standard filesystem tools: `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`
- The `execute` tool for shell commands
- Secure isolation boundary

### 4.3 Architecture

`BaseSandbox` requires providers to implement only `execute()`. All filesystem operations (`read`, `write`, `edit`, `ls`, `glob`, `grep`) are built on top of `execute()` by the base class.

### 4.4 Integration Example (Daytona)

```python
from daytona import Daytona
from deepagents import create_deep_agent
from langchain_anthropic import ChatAnthropic
from langchain_daytona import DaytonaSandbox

sandbox = Daytona().create()
backend = DaytonaSandbox(sandbox=sandbox)

agent = create_deep_agent(
    model=ChatAnthropic(model="claude-sonnet-4-6"),
    system_prompt="You are a Python coding assistant with sandbox access.",
    backend=backend,
)
try:
    result = agent.invoke(
        {"messages": [{"role": "user", "content": "Create a small Python package and run pytest"}]}
    )
finally:
    sandbox.stop()
```

### 4.5 File Transfer APIs

Two planes of file access:

1. **Agent filesystem tools** -- called by the LLM, go through `execute()` inside sandbox
2. **File transfer APIs** -- called by application code, use provider-native APIs

```python
# Upload files before agent runs
backend.upload_files([
    ("/src/index.py", b"print('Hello')\n"),
    ("/pyproject.toml", b"[project]\nname = 'my-app'\n"),
])

# Download files after agent finishes
results = backend.download_files(["/src/index.py", "/output.txt"])
for result in results:
    if result.content is not None:
        print(f"{result.path}: {result.content.decode()}")
    else:
        print(f"Failed: {result.path}: {result.error}")
```

### 4.6 Scoping Strategies

- **Thread-scoped (default):** Each conversation gets its own sandbox
- **Assistant-scoped:** All threads for a given assistant share one sandbox

### 4.7 Integration Patterns

**Pattern 1: Agent IN Sandbox** -- agent framework runs inside the sandbox VM/container. API keys must live inside (security risk). Tight coupling but mirrors local dev.

**Pattern 2: Sandbox AS Tool (recommended)** -- agent runs on host, calls sandbox tools remotely. API keys stay outside. Clean separation. Pay only for execution time.

### 4.8 Security

**NEVER put secrets inside a sandbox.** API keys, tokens, credentials injected into a sandbox can be read and exfiltrated.

Safe secret handling:

1. **Tools outside sandbox (recommended)** -- define tools in host environment
2. **Network proxy with credential injection** -- proxy intercepts HTTP and attaches credentials

General best practices:

- Review sandbox outputs before acting on them
- Block sandbox network access when not needed
- Use middleware to filter/redact sensitive patterns
- Treat sandbox output as untrusted input

---

## 5. Permissions

Declarative filesystem access control via `permissions=` parameter. Applies ONLY to built-in filesystem tools (`ls`, `read_file`, `glob`, `grep`, `write_file`, `edit_file`). Custom tools and MCP tools are NOT covered.

### 5.1 FilesystemPermission

| Field        | Type                      | Purpose                                                             |
| ------------ | ------------------------- | ------------------------------------------------------------------- |
| `operations` | `list["read" \| "write"]` | "read" = ls, read_file, glob, grep; "write" = write_file, edit_file |
| `paths`      | `list[str]`               | Glob patterns with `**` recursive and `{a,b}` alternation           |
| `mode`       | `"allow" \| "deny"`       | Permit or block (default: "allow")                                  |

### 5.2 Evaluation Logic

**First matching rule wins. If no rule matches, the operation is allowed.**

Place more specific rules BEFORE broader ones.

### 5.3 Common Patterns

**Read-only agent:**

```python
permissions=[
    FilesystemPermission(operations=["write"], paths=["/**"], mode="deny"),
]
```

**Isolated workspace:**

```python
permissions=[
    FilesystemPermission(operations=["read", "write"], paths=["/workspace/**"], mode="allow"),
    FilesystemPermission(operations=["read", "write"], paths=["/**"], mode="deny"),
]
```

**Protected files:**

```python
permissions=[
    FilesystemPermission(operations=["read", "write"], paths=["/workspace/.env", "/workspace/examples/**"], mode="deny"),
    FilesystemPermission(operations=["read", "write"], paths=["/workspace/**"], mode="allow"),
    FilesystemPermission(operations=["read", "write"], paths=["/**"], mode="deny"),
]
```

**Deny all baseline:**

```python
permissions=[
    FilesystemPermission(operations=["read", "write"], paths=["/**"], mode="deny"),
]
```

### 5.4 Subagent Permissions

Subagents inherit parent permissions by default. Setting `permissions` on a subagent spec **replaces** parent rules entirely.

```python
subagents=[
    {
        "name": "auditor",
        "description": "Read-only code reviewer",
        "system_prompt": "Review the code for issues.",
        "permissions": [
            FilesystemPermission(operations=["write"], paths=["/**"], mode="deny"),
            FilesystemPermission(operations=["read"], paths=["/workspace/**"], mode="allow"),
            FilesystemPermission(operations=["read"], paths=["/**"], mode="deny"),
        ],
    }
]
```

### 5.5 CompositeBackend + Sandbox Constraint

When using CompositeBackend with a sandbox default, every permission path must be scoped under a known route prefix. Paths hitting the sandbox default raise `NotImplementedError`.

---

## 6. Human-in-the-Loop

Requires a checkpointer (e.g., `MemorySaver`) for state persistence between interrupt and resume.

### 6.1 Decision Types

| Decision    | Effect                                 |
| ----------- | -------------------------------------- |
| `"approve"` | Execute tool with original arguments   |
| `"edit"`    | Modify tool arguments before execution |
| `"reject"`  | Skip tool execution entirely           |

### 6.2 Configuration

```python
from langgraph.checkpoint.memory import MemorySaver

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    tools=[delete_file, read_file, send_email],
    interrupt_on={
        "delete_file": True,                                    # All decisions
        "read_file": False,                                     # No interrupts
        "send_email": {"allowed_decisions": ["approve", "reject"]},  # No editing
    },
    checkpointer=MemorySaver()  # Required!
)
```

### 6.3 Interrupt Handling Flow

```python
from langchain_core.utils.uuid import uuid7
from langgraph.types import Command

config = {"configurable": {"thread_id": str(uuid7())}}

result = agent.invoke(
    {"messages": [{"role": "user", "content": "Delete temp.txt"}]},
    config=config,
    version="v2",
)

if result.interrupts:
    interrupt_value = result.interrupts[0].value
    action_requests = interrupt_value["action_requests"]
    review_configs = interrupt_value["review_configs"]

    config_map = {cfg["action_name"]: cfg for cfg in review_configs}

    for action in action_requests:
        review_config = config_map[action["name"]]
        print(f"Tool: {action['name']}, Args: {action['args']}")
        print(f"Allowed: {review_config['allowed_decisions']}")

    decisions = [{"type": "approve"}]

    result = agent.invoke(
        Command(resume={"decisions": decisions}),
        config=config,  # Same config!
        version="v2",
    )

print(result.value["messages"][-1].content)
```

### 6.4 Multiple Tool Calls

All interrupts batch together. Decisions list must match action_requests order.

```python
decisions = [
    {"type": "approve"},  # First tool
    {"type": "reject"}    # Second tool
]
```

### 6.5 Editing Arguments

```python
decisions = [{
    "type": "edit",
    "edited_action": {
        "name": action_request["name"],
        "args": {"to": "team@company.com", "subject": "...", "body": "..."}
    }
}]
```

### 6.6 Subagent Interrupts

Two patterns:

1. **On tool calls** -- subagent can override parent `interrupt_on`
2. **Within tool calls** -- subagent tools call `interrupt()` directly

```python
from langgraph.types import interrupt

@tool
def request_approval(action_description: str) -> str:
    """Request human approval using interrupt() primitive."""
    approval = interrupt({
        "type": "approval_request",
        "action": action_description,
        "message": f"Please approve or reject: {action_description}",
    })
    if approval.get("approved"):
        return f"Action '{action_description}' was APPROVED."
    else:
        return f"Action '{action_description}' was REJECTED."
```

---

## 7. Skills

Reusable agent capabilities providing specialized workflows and domain knowledge. Based on the [Agent Skills specification](https://agentskills.io/specification).

### 7.1 Directory Structure

```
skills/
  langgraph-docs/
    SKILL.md
  arxiv_search/
    SKILL.md
    arxiv_search.py
```

### 7.2 SKILL.md Format

YAML frontmatter followed by instructions:

| Field              | Type   | Required | Notes                                                         |
| ------------------ | ------ | -------- | ------------------------------------------------------------- |
| `name`             | string | Yes      | Skill identifier                                              |
| `description`      | string | Yes      | Max 1,024 characters; agents match skills based on this alone |
| `license`          | string | No       | e.g., MIT                                                     |
| `compatibility`    | string | No       | Dependencies/requirements                                     |
| `allowed-tools`    | array  | No       | Permitted tool names                                          |
| `metadata.author`  | string | No       | Creator attribution                                           |
| `metadata.version` | string | No       | Version number                                                |

**Size constraint:** SKILL.md files must be under 10 MB.

### 7.3 Progressive Disclosure

1. **Match** -- check if skill descriptions align with user prompt
2. **Read** -- load full SKILL.md if matched
3. **Execute** -- follow instructions, access supporting files

### 7.4 Skills Parameter

`skills` accepts `list[str]` with forward-slash paths relative to backend root. Later sources override earlier ones (last-wins).

### 7.5 Subagent Skills

- General-purpose subagents inherit main agent skills automatically
- Custom subagents require explicit `skills` parameter
- Skill state is fully isolated between agents

### 7.6 Skills vs. Memory

| Aspect  | Skills                             | Memory             |
| ------- | ---------------------------------- | ------------------ |
| Loading | On-demand (progressive disclosure) | Always at startup  |
| Purpose | Task-specific capabilities         | Persistent context |
| Format  | SKILL.md with metadata             | AGENTS.md files    |

---

## 8. Subagents

Subagents solve the **context bloat problem** by delegating work while maintaining clean context.

### 8.1 When to Use

**Appropriate:**

- Multi-step tasks cluttering main context
- Specialized domains needing custom instructions
- Tasks needing different model capabilities
- Maintaining main agent focus on coordination

**Inappropriate:**

- Simple single-step tasks
- When intermediate context must be retained
- When overhead exceeds benefits

### 8.2 SubAgent Configuration (Dictionary)

| Field             | Type                         | Details                                              |
| ----------------- | ---------------------------- | ---------------------------------------------------- |
| `name`            | `str`                        | Unique identifier                                    |
| `description`     | `str`                        | Action-oriented description for delegation decisions |
| `system_prompt`   | `str`                        | Required; does NOT inherit from main agent           |
| `tools`           | `list[Callable]`             | Optional; overrides inherited tools                  |
| `model`           | `str \| BaseChatModel`       | Optional override                                    |
| `middleware`      | `list[Middleware]`           | Optional; no inheritance                             |
| `interrupt_on`    | `dict[str, bool]`            | Optional HITL config                                 |
| `skills`          | `list[str]`                  | Optional; no inheritance except general-purpose      |
| `response_format` | `ResponseFormat`             | Optional structured output schema                    |
| `permissions`     | `list[FilesystemPermission]` | Optional; replaces parent rules                      |

### 8.3 CompiledSubAgent (LangGraph Graphs)

```python
from deepagents import CompiledSubAgent
from langchain.agents import create_agent

custom_graph = create_agent(model=your_model, tools=specialized_tools, prompt="...")

subagent = CompiledSubAgent(
    name="data-analyzer",
    description="Specialized agent for complex data analysis",
    runnable=custom_graph  # Must be .compile()'d
)
```

### 8.4 General-Purpose Subagent

Every agent automatically gets a "general-purpose" subagent with:

- Same system prompt as main agent
- All the same tools
- Same model (unless overridden)
- Inherits skills (when configured)

Providing a subagent named `"general-purpose"` fully replaces the default.

### 8.5 Structured Output from Subagents

```python
from pydantic import BaseModel, Field

class ResearchFindings(BaseModel):
    summary: str = Field(description="Summary of findings")
    confidence: float = Field(description="Confidence score 0-1")
    sources: list[str] = Field(description="Source URLs")

research_subagent = {
    "name": "researcher",
    "description": "Researches topics and returns structured findings",
    "system_prompt": "Research the given topic thoroughly.",
    "tools": [web_search],
    "response_format": ResearchFindings,
}
```

### 8.6 Runtime Context Propagation

Context automatically propagates from parent to all subagents:

```python
from dataclasses import dataclass
from langchain.tools import tool, ToolRuntime

@dataclass
class Context:
    user_id: str
    session_id: str

@tool
def get_user_data(query: str, runtime: ToolRuntime[Context]) -> str:
    """Fetch data for the current user."""
    user_id = runtime.context.user_id
    return f"Data for user {user_id}: {query}"
```

### 8.7 Identifying Calling Subagent

```python
@tool
def shared_lookup(query: str, runtime: ToolRuntime) -> str:
    agent_name = runtime.config.get("metadata", {}).get("lc_agent_name")
    if agent_name == "fact-checker":
        return strict_lookup(query)
    return general_lookup(query)
```

### 8.8 Streaming Metadata

Agent names available as `lc_agent_name` in metadata during streaming.

```python
agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    subagents=subagents,
    name="main-agent"
)
```

### 8.9 Best Practices

1. **Clear descriptions** -- "Analyzes financial data and generates investment insights" not "Does finance stuff"
2. **Detailed system prompts** -- include output format, word limits, step-by-step instructions
3. **Minimal tool sets** -- only tools the subagent needs
4. **Model selection by task** -- expensive models for complex reasoning, cheap for simple tasks
5. **Concise results instruction** -- "Keep response under 300 words", "Do NOT include raw data"

---

## 9. Memory

Persistent state across conversations using filesystem-backed storage.

### 9.1 Core Mechanism

1. Point agents to memory files via `memory=` parameter
2. Agents load files at startup or on-demand
3. Agents optionally update memory using `edit_file` tool

### 9.2 Scoping Patterns

**Agent-scoped:** Shared across all users. Namespace: `(assistant_id,)`

```python
agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    memory=["/memories/AGENTS.md"],
    backend=CompositeBackend(
        default=StateBackend(),
        routes={
            "/memories/": StoreBackend(
                namespace=lambda rt: (rt.server_info.assistant_id,),
            ),
        },
    ),
)
```

**User-scoped:** Isolated per user. Namespace: `(user_id,)`

```python
StoreBackend(namespace=lambda rt: (rt.server_info.user.identity,))
```

### 9.3 Memory Dimensions

| Dimension        | Options                                                             |
| ---------------- | ------------------------------------------------------------------- |
| Duration         | Short-term (single conversation), Long-term (persistent)            |
| Information type | Episodic (experiences), Procedural (instructions), Semantic (facts) |
| Scope            | User, Agent, Organization                                           |
| Update strategy  | During conversation, Background processing                          |
| Retrieval        | At prompt initialization, On-demand                                 |
| Permissions      | Read-write (default), Read-only                                     |

### 9.4 Episodic Memory (Past Conversations)

```python
from langgraph_sdk import get_client
from langchain.tools import tool, ToolRuntime

client = get_client(url="<DEPLOYMENT_URL>")

@tool
async def search_past_conversations(query: str, runtime: ToolRuntime) -> str:
    """Search past conversations for relevant context."""
    user_id = runtime.server_info.user.identity
    threads = await client.threads.search(
        metadata={"user_id": user_id},
        limit=5,
    )
    results = []
    for thread in threads:
        history = await client.threads.get_history(thread_id=thread["thread_id"])
        results.append(history)
    return str(results)
```

### 9.5 Organization-Level Memory

Typically **read-only** to prevent injection. Populated via application code:

```python
from deepagents.backends.utils import create_file_data

await client.store.put_item(
    (org_id,),
    "/compliance.md",
    create_file_data("""## Compliance policies
- Never disclose internal pricing
- Always include disclaimers on financial advice
"""),
)
```

### 9.6 Background Consolidation

A separate agent processes memories between conversations:

```python
@tool
async def search_recent_conversations(query: str, runtime: ToolRuntime) -> str:
    """Search conversations updated in the last 6 hours."""
    user_id = runtime.server_info.user.identity
    since = datetime.now(timezone.utc) - timedelta(hours=6)
    threads = await sdk_client.threads.search(
        metadata={"user_id": user_id},
        updated_after=since.isoformat(),
        limit=20,
    )
    # ... process threads
```

Scheduled via cron:

```python
cron_job = await client.crons.create(
    assistant_id="consolidation_agent",
    schedule="0 */6 * * *",
    input={"messages": [{"role": "user", "content": "Consolidate recent memories."}]},
)
```

**Critical:** Cron interval must match lookback window.

### 9.7 Concurrent Write Handling

Multiple threads writing identical files risk last-write-wins conflicts. Mitigations:

- User-scoped memory rarely encounters this
- Agent/org-scoped: use background consolidation or separate files per topic

### 9.8 Multi-Agent Isolation

Add `assistant_id` to namespace:

```python
StoreBackend(
    namespace=lambda rt: (
        rt.server_info.assistant_id,
        rt.server_info.user.identity,
    ),
)
```

---

## 10. Middleware

### 10.1 Default Middleware Stack

Always included:

- TodoListMiddleware
- FilesystemMiddleware
- SubAgentMiddleware
- SummarizationMiddleware
- AnthropicPromptCachingMiddleware
- PatchToolCallsMiddleware

Conditional (when features enabled):

- MemoryMiddleware
- SkillsMiddleware
- HumanInTheLoopMiddleware

### 10.2 Summarization

Compresses conversation history approaching token limits.

```python
# Trigger/Keep specifications use tuples:
("tokens", 4000)
("messages", 20)
("fraction", 0.8)
```

Parameters:

- `model` -- summarization model (can use cheaper variant)
- `trigger` -- `ContextSize` conditions (OR logic if multiple)
- `keep` -- context preservation spec
- `token_counter` -- custom token counting function
- `summary_prompt` -- template with `{messages}` placeholder
- `trim_tokens_to_summarize` -- max tokens for summary (default: 4000)

### 10.3 Model Call Limit

Prevents excessive API calls.

- `thread_limit` -- max calls across all runs (requires checkpointer)
- `run_limit` -- max calls per invocation
- `exit_behavior` -- `"end"` (graceful) or `"error"` (exception)

### 10.4 Tool Call Limit

Controls tool execution counts globally or per-tool.

- `tool_name` -- specific tool (omit for global)
- `thread_limit` -- conversation-wide max
- `run_limit` -- per-invocation max
- `exit_behavior` -- `"continue"` (block with errors), `"error"` (raise), `"end"` (stop)

### 10.5 Model Fallback

Automatic fallback to alternative models on failure.

```python
# first_model, *additional_models in sequence
```

### 10.6 PII Detection

Detects and handles Personally Identifiable Information.

Built-in types: `email`, `credit_card`, `ip`, `mac_address`, `url`

Strategies:

- `"block"` -- raise exception
- `"redact"` -- replace with `[REDACTED_{TYPE}]`
- `"mask"` -- partial obscuring (e.g., `****-****-****-1234`)
- `"hash"` -- deterministic hash

Custom detectors: regex strings, compiled patterns, or custom functions returning `[{"text", "start", "end"}]`.

Application flags: `apply_to_input`, `apply_to_output`, `apply_to_tool_results`.

### 10.7 To-Do List

Equips agents with `write_todos` tool for task planning and tracking.

- `system_prompt` -- custom guidance
- `tool_description` -- custom write_todos description

### 10.8 LLM Tool Selector

Pre-filters relevant tools before main model invocation.

- `model` -- selection model (defaults to agent's)
- `system_prompt` -- selection instructions
- `max_tools` -- maximum tools to select
- `always_include` -- tools never filtered out

### 10.9 Tool Retry

Automatic retry with exponential backoff for failed tool calls.

- `max_retries` -- attempts after initial (default: 2)
- `tools` -- specific tools (None = all)
- `retry_on` -- exception types or callable predicate
- `on_failure` -- `"return_message"`, `"raise"`, or custom function
- `backoff_factor` -- exponential multiplier (default: 2.0)
- `initial_delay` -- starting delay seconds (default: 1.0)
- `max_delay` -- backoff ceiling (default: 60.0)
- `jitter` -- +/-25% randomness (default: true)

### 10.10 Model Retry

Same as Tool Retry but for model calls. `on_failure` defaults to `"continue"`.

### 10.11 LLM Tool Emulator

Replaces tool execution with AI-generated responses for testing.

- `tools` -- tools to emulate (None=all, []=none)
- `model` -- emulation model

### 10.12 Context Editing

Manages token consumption by clearing older tool outputs.

**ClearToolUsesEdit:**

- `trigger` -- token threshold (default: 100000)
- `clear_at_least` -- minimum tokens to reclaim (default: 0)
- `keep` -- recent tool results to preserve (default: 3)
- `clear_tool_inputs` -- remove tool arguments (default: false)
- `exclude_tools` -- tools never cleared
- `placeholder` -- replacement text (default: "[cleared]")

### 10.13 Shell Tool

Persistent shell session for agents.

Execution policies:

- `HostExecutionPolicy` -- direct native execution
- `DockerExecutionPolicy` -- isolated container
- `CodexSandboxExecutionPolicy` -- CLI sandbox

Parameters:

- `workspace_root` -- base directory (temp if omitted)
- `startup_commands` -- sequential init commands
- `shutdown_commands` -- pre-termination cleanup
- `execution_policy` -- policy selection
- `redaction_rules` -- output sanitization
- `shell_command` -- executable path (default: /bin/bash)
- `env` -- environment variables

**Limitation:** No persistent shell with human-in-the-loop interrupts.

### 10.14 File Search

Glob and Grep search tools over filesystem.

- `root_path` -- required search root
- `use_ripgrep` -- use ripgrep when available (default: true)
- `max_file_size_mb` -- skip larger files (default: 10)

### 10.15 Provider-Specific Middleware

- **Anthropic:** prompt caching, bash, text editor, memory, file search
- **AWS:** prompt caching for Bedrock
- **OpenAI:** content moderation

---

## 11. Customization Summary (`create_deep_agent` Parameters)

| Parameter         | Type                             | Description                                          |
| ----------------- | -------------------------------- | ---------------------------------------------------- |
| `model`           | `str \| BaseChatModel`           | Provider:model string or LangChain model instance    |
| `tools`           | `list[Callable]`                 | Custom tool functions with type hints and docstrings |
| `system_prompt`   | `str`                            | Override default system prompt                       |
| `middleware`      | `list[Middleware]`               | Custom middleware stack                              |
| `subagents`       | `list[dict \| CompiledSubAgent]` | Subagent specifications                              |
| `backend`         | `BackendProtocol`                | Filesystem backend                                   |
| `interrupt_on`    | `dict[str, bool \| dict]`        | Human-in-the-loop per tool                           |
| `checkpointer`    | `BaseCheckpointSaver`            | State persistence (required for HITL)                |
| `skills`          | `list[str]`                      | Skill source paths                                   |
| `memory`          | `list[str]`                      | Memory file paths (AGENTS.md)                        |
| `permissions`     | `list[FilesystemPermission]`     | Filesystem access rules                              |
| `response_format` | `BaseModel`                      | Pydantic model for structured output                 |
| `context_schema`  | `dataclass`                      | Runtime context type                                 |
| `store`           | `BaseStore`                      | LangGraph store for StoreBackend                     |
| `name`            | `str`                            | Agent name for tracing metadata                      |

### Structured Output

```python
from pydantic import BaseModel

class MyResponse(BaseModel):
    answer: str
    confidence: float

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    response_format=MyResponse,
)
# Result in result["structured_response"]
```

---

## 12. Quickstart: Research Agent

Complete example combining tools, subagents, and planning:

```python
import os
from typing import Literal
from tavily import TavilyClient
from deepagents import create_deep_agent

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

def internet_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = False,
):
    """Run a web search"""
    return tavily_client.search(
        query,
        max_results=max_results,
        include_raw_content=include_raw_content,
        topic=topic,
    )

research_instructions = """You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.
"""

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    tools=[internet_search],
    system_prompt=research_instructions,
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "What is langgraph?"}]}
)
print(result["messages"][-1].content)
```

Automated agent behavior:

1. Plans approach using `write_todos`
2. Conducts research via tools
3. Manages context with `write_file`, `read_file`
4. Spawns subagents for complex subtasks
5. Synthesizes comprehensive reports

---

## 13. Key Architectural Decisions

1. **Backend protocol is the extension point** -- implement 6 methods (ls, read, grep, glob, write, edit) to plug any storage system
2. **Namespace factories control data isolation** -- per-user, per-assistant, per-thread, or combinations
3. **Permissions are declarative and first-match-wins** -- specific rules before broad ones
4. **Subagents solve context bloat** -- delegate work, get back concise summaries
5. **Skills use progressive disclosure** -- only loaded when relevant to the prompt
6. **Memory uses AGENTS.md files** -- read at startup, updated via edit_file
7. **Middleware is composable** -- default stack plus custom additions
8. **Sandboxes implement only `execute()`** -- base class handles all filesystem operations on top
9. **Human-in-the-loop requires checkpointer** -- state must persist between interrupt and resume
10. **Runtime context propagates automatically** -- parent context flows to all subagents

---

## 14. Package & Ecosystem

- **PyPI:** `deepagents`
- **GitHub:** https://github.com/langchain-ai/deepagents
- **API Reference:** https://reference.langchain.com/python/deepagents/
- **Tracing:** Set `LANGSMITH_TRACING=true` with API key for LangSmith
- **Provider packages:** `langchain-anthropic`, `langchain-openai`, `langchain-google-genai`, `langchain-openrouter`, `langchain-fireworks`, `langchain-baseten`, `langchain-ollama`
- **Sandbox packages:** `langchain-modal`, `langchain-runloop`, `langchain-daytona`, `langsmith[sandbox]`, `langchain-agentcore-codeinterpreter`

---

## 15. Context Engineering (added 2026-05-04)

> Source: https://docs.langchain.com/oss/python/deepagents/context-engineering

DeepAgents manages five distinct context categories for optimal token usage and state management.

### 15.1 Context Types

| Type                    | Description                                    | Mechanism                                               |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| **Input Context**       | System prompt, memory, skills                  | Loaded at startup; always present                       |
| **Runtime Context**     | Per-run config (user metadata, API keys)       | `context_schema` dataclass; propagates to all subagents |
| **Context Compression** | Automatic offloading and summarization         | Triggers at 85% token capacity                          |
| **Context Isolation**   | Subagent delegation for compartmentalized work | `task()` tool; fresh context per subagent               |
| **Long-term Memory**    | Persistent storage across threads              | `StoreBackend` with `CompositeBackend` routing          |

### 15.2 Runtime Context (Critical for Pipelines)

Runtime context passes per-invocation configuration **without automatic prompt inclusion**. Define via `@dataclass` and access in tools via `ToolRuntime`:

```python
from dataclasses import dataclass
from deepagents import create_deep_agent
from langchain.tools import tool, ToolRuntime

@dataclass
class Context:
    user_id: str
    api_key: str

@tool
def fetch_user_data(query: str, runtime: ToolRuntime[Context]) -> str:
    """Fetch data for the current user."""
    user_id = runtime.context.user_id
    return f"Data for user {user_id}: {query}"

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    tools=[fetch_user_data],
    context_schema=Context,
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "Get my recent activity"}]},
    context=Context(user_id="user-123", api_key="sk-..."),
)
```

**Key property:** Runtime context **propagates to all subagents automatically**. When a subagent executes, it receives the same runtime context as its parent.

### 15.3 Dynamic System Prompts

For prompts that need runtime values, use `@dynamic_prompt` decorator to read from `request.runtime.context` and `request.runtime.store`.

### 15.4 Context Compression

**Offloading** (automatic):

- Tool inputs/outputs > 20,000 tokens → stored to filesystem, replaced with file reference + 10-line preview
- At 85% context capacity, older tool calls truncated and replaced with disk pointers

**Summarization** (automatic):

- Triggers at 85% of model's `max_input_tokens`
- Retains 10% as recent context
- Falls back to 170,000-token trigger if profile unavailable
- Writes complete original messages to filesystem as canonical record
- Handles `ContextOverflowError` by immediately summarizing and retrying

**Optional summarization tool** (agents can trigger compression at strategic points):

```python
from deepagents.middleware.summarization import create_summarization_tool_middleware

agent = create_deep_agent(
    model="google_genai:gemini-3.1-pro-preview",
    middleware=[create_summarization_tool_middleware(model, StateBackend)],
)
```

### 15.5 System Prompt Assembly Order

The assembled system message follows this exact sequence:

1. Custom `system_prompt`
2. Base agent prompt
3. To-do list prompt
4. Memory prompt
5. Skills prompt
6. Virtual filesystem prompt
7. Subagent prompt
8. User middleware prompts
9. Human-in-the-loop prompt

### 15.6 Best Practices for State Management

1. **Input context:** Minimize memory for universal conventions; use focused skills for task-specific workflows
2. **Subagent delegation:** Isolate multi-step, output-heavy tasks to maintain main agent context efficiency
3. **Subagent output control:** Add `system_prompt` guidance directing synthesis/summarization rather than raw output
4. **Filesystem leverage:** Persist large outputs so active context remains compact; use `read_file` and `grep` for selective retrieval
5. **Memory documentation:** Clearly specify `/memories/` structure and usage patterns for agent awareness
6. **Runtime context for tools:** Supply user metadata, API keys, and static configuration enabling tools to access context via injected `ToolRuntime` object

---

## 16. Async Subagents (Preview) (added 2026-05-04)

Preview feature for parallel subagent execution. **API may change.**

### 16.1 Tools

| Tool                | Purpose                                 |
| ------------------- | --------------------------------------- |
| `start_async_task`  | Launch task, returns job ID immediately |
| `check_async_task`  | Retrieve status/results                 |
| `update_async_task` | Send mid-flight instructions            |
| `list_async_tasks`  | Summarize all tracked tasks             |
| `cancel_async_task` | Terminate running tasks                 |

Async task metadata lives in a dedicated `async_tasks` state channel, separate from message history, so task IDs survive context compaction/summarization.

### 16.2 Caveats

- Requires Agent Protocol-compatible servers
- Worker pool exhaustion can queue launches
- Supervisors polling immediately post-launch negates async benefits
- Task ID truncation can cause lookup failures

---

## 17. Known Issues & Limitations (added 2026-05-04)

### Architectural

- **No inter-step validation** as a first-class concept. Must be composed from middleware + permissions + structured output.
- **Synchronous subagents block the parent**. Async subagents are preview with potential API changes.
- **Last-write-wins** on concurrent file writes to the same path. No built-in conflict resolution or locking.
- **Subagent file leakage**: Files written by subagents persist in parent state after subagent completion.
- **Trust-the-LLM security model**: No built-in self-policing. Boundaries enforced at tool/sandbox level only.
- **Cannot list SubAgentMiddleware in `excluded_middleware`** -- must use `enabled=False` flag instead.

### Open Bugs

- **#3050**: Virtual paths from `CompositeBackend` routes don't resolve in `LocalShellBackend.execute` (backends, bug)
- **#3105**: `BaseSandbox.ls` silently swallows errors, returning empty results (bug)
