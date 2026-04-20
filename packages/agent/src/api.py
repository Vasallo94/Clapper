import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.types import Command
from pydantic import BaseModel

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
    content = messages[-1].content if messages else ""
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
