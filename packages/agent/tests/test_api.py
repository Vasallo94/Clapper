import os

import pytest
from httpx import ASGITransport, AsyncClient

from src.api import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.environ.get("GOOGLE_API_KEY") and not os.environ.get("ANTHROPIC_API_KEY"),
    reason="No LLM API key available",
)
async def test_chat_returns_response_or_checkpoint(client):
    response = await client.post(
        "/api/chat",
        json={"message": "Hola, quiero un video corto del seguro de hogar"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "thread_id" in body
    assert body["type"] in ("message", "checkpoint")


@pytest.mark.asyncio
async def test_chat_history_empty_thread(client):
    response = await client.get("/api/chat/nonexistent-thread")
    assert response.status_code == 200
    body = response.json()
    assert body["messages"] == []
