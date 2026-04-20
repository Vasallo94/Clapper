import json
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
_ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(_ROOT_DIR / ".env")

# Resolve GOOGLE_APPLICATION_CREDENTIALS relative to project root
_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
if _creds and not Path(_creds).is_absolute():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(_ROOT_DIR / _creds)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.types import Command
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from .agent import create_video_agent

app = FastAPI(title="Remotion Video Agent")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Lazy initialization to avoid failures during import when API keys are missing
_agent = None


def _get_agent():
    global _agent
    if _agent is None:
        _agent = create_video_agent()
    return _agent


# In-memory thread history for GET /api/chat/:threadId
_thread_messages: dict[str, list[dict]] = {}


def _generate_thread_id() -> str:
    from uuid import uuid4

    return str(uuid4())


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ResumeRequest(BaseModel):
    thread_id: str
    decision: dict


def _normalize_content(content) -> str:
    """Normalize LangChain message content to a plain string.

    Content can be a string or a list of content blocks like
    [{"type": "text", "text": "..."}, ...]. Extract text from all blocks.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return str(content)


def _extract_response(result, thread_id: str) -> dict:
    """Extract a response dict from an agent invoke result."""
    if result.interrupts:
        interrupt_value = result.interrupts[0].value
        return {
            "type": "checkpoint",
            "data": interrupt_value,
            "thread_id": thread_id,
        }

    messages = result.value.get("messages", [])
    content = _normalize_content(messages[-1].content) if messages else ""
    return {
        "type": "message",
        "content": content,
        "thread_id": thread_id,
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    thread_id = request.thread_id or _generate_thread_id()
    config = {"configurable": {"thread_id": thread_id}}

    agent = _get_agent()
    result = agent.invoke(
        {"messages": [{"role": "user", "content": request.message}]},
        config=config,
        version="v2",
    )

    return _extract_response(result, thread_id)


@app.post("/api/chat/resume")
async def resume(request: ResumeRequest):
    config = {"configurable": {"thread_id": request.thread_id}}

    agent = _get_agent()
    result = agent.invoke(
        Command(resume=request.decision),
        config=config,
        version="v2",
    )

    return _extract_response(result, request.thread_id)


@app.get("/api/chat/{thread_id}")
async def get_history(thread_id: str):
    """Get the message history for a thread."""
    try:
        agent = _get_agent()
        state = agent.get_state({"configurable": {"thread_id": thread_id}})
        messages = [{"role": m.type, "content": m.content} for m in state.values.get("messages", [])]
        return {"thread_id": thread_id, "messages": messages}
    except Exception:
        return {"thread_id": thread_id, "messages": []}


@app.get("/api/chat/{thread_id}/stream")
async def stream_chat(thread_id: str):
    """SSE endpoint for real-time agent progress."""
    agent = _get_agent()
    config = {"configurable": {"thread_id": thread_id}}

    async def event_generator():
        try:
            async for event in agent.astream(
                None,
                config=config,
                stream_mode=["updates", "custom"],
                version="v2",
            ):
                event_data = {}
                if isinstance(event, dict):
                    if "ns" in event:
                        agent_name = event.get("ns", ["orchestrator"])[-1] if event.get("ns") else "orchestrator"
                        event_data = {
                            "type": "agent_status",
                            "agent": agent_name,
                            "status": "running",
                        }
                    elif "type" in event:
                        event_data = event

                if event_data:
                    yield f"data: {json.dumps(event_data)}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
