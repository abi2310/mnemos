import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.chat import ChatService
from app.core import dependencies as core_deps
from sqlalchemy import create_engine
from sqlmodel import SQLModel


@pytest.fixture
def test_db():
    """Create a temporary SQLite database for testing."""
    import tempfile
    import os

    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)  # Close the file descriptor

    engine = create_engine(f"sqlite:///{path}", echo=False)
    SQLModel.metadata.create_all(engine)

    yield engine

    os.unlink(path)


@pytest.fixture
def chat_service(test_db):
    """Create a ChatService with test database."""
    service = ChatService()
    service.engine = test_db
    # Tables are already created in test_db fixture
    return service


@pytest.fixture
def client(chat_service):
    """TestClient with overridden chat service."""
    app.dependency_overrides[core_deps.get_chat_service] = lambda: chat_service

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def test_create_chat(client):
    """Test creating a chat via API."""
    chat_data = {
        "dataset_id": "dataset456"
    }

    resp = client.post("/api/v1/chats", json=chat_data)
    assert resp.status_code == 201, resp.text

    body = resp.json()
    assert "id" in body
    assert body["dataset_id"] == "dataset456"
    assert "created_at" in body
    assert "updated_at" in body

    chat_id = body["id"]
    return chat_id


def test_get_chat(client):
    """Test getting a chat via API."""
    # First create a chat
    chat_data = {
        "dataset_id": "dataset456"
    }
    resp = client.post("/api/v1/chats", json=chat_data)
    chat_id = resp.json()["id"]

    # Now get it
    resp = client.get(f"/api/v1/chats/{chat_id}")
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["id"] == chat_id
    assert body["dataset_id"] == "dataset456"
    assert "messages" in body
    assert body["messages"] == []  # No messages yet


def test_get_nonexistent_chat(client):
    """Test getting a non-existent chat returns 404."""
    resp = client.get("/api/v1/chats/999")
    assert resp.status_code == 404, resp.text


def test_add_message(client):
    """Test adding a message to a chat via API."""
    # Create chat
    chat_data = {"dataset_id": "dataset456"}
    resp = client.post("/api/v1/chats", json=chat_data)
    chat_id = resp.json()["id"]

    # Add message
    message_data = {
        "role": "user",
        "content": "Hello, world!"
    }
    resp = client.post(f"/api/v1/chats/{chat_id}/messages", json=message_data)
    assert resp.status_code == 201, resp.text

    body = resp.json()
    assert "id" in body
    assert body["chat_id"] == chat_id
    assert body["role"] == "user"
    assert body["content"] == "Hello, world!"
    assert "created_at" in body


def test_add_message_to_nonexistent_chat(client):
    """Test adding a message to non-existent chat returns 404."""
    message_data = {
        "role": "user",
        "content": "Hello"
    }
    resp = client.post("/api/v1/chats/999/messages", json=message_data)
    assert resp.status_code == 404, resp.text


def test_get_messages(client):
    """Test getting messages for a chat via API."""
    # Create chat
    chat_data = {"dataset_id": "dataset456"}
    resp = client.post("/api/v1/chats", json=chat_data)
    chat_id = resp.json()["id"]

    # Add messages
    messages_data = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is 2+2?"},
        {"role": "assistant", "content": "2+2 equals 4."}
    ]

    for msg_data in messages_data:
        resp = client.post(f"/api/v1/chats/{chat_id}/messages", json=msg_data)
        assert resp.status_code == 201

    # Get messages
    resp = client.get(f"/api/v1/chats/{chat_id}/messages")
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert len(body) == 3
    assert body[0]["role"] == "system"
    assert body[0]["content"] == "You are a helpful assistant."
    assert body[1]["role"] == "user"
    assert body[1]["content"] == "What is 2+2?"
    assert body[2]["role"] == "assistant"
    assert body[2]["content"] == "2+2 equals 4."


def test_get_messages_for_nonexistent_chat(client):
    """Test getting messages for non-existent chat returns 404."""
    resp = client.get("/api/v1/chats/999/messages")
    assert resp.status_code == 404, resp.text


def test_chat_with_messages_integration(client):
    """Integration test: create chat, add messages, get chat with messages."""
    # Create chat
    chat_data = {"dataset_id": "testdataset"}
    resp = client.post("/api/v1/chats", json=chat_data)
    assert resp.status_code == 201
    chat_id = resp.json()["id"]

    # Add messages
    messages = [
        {"role": "user", "content": "First message"},
        {"role": "assistant", "content": "First response"},
        {"role": "user", "content": "Second message"}
    ]

    for msg in messages:
        resp = client.post(f"/api/v1/chats/{chat_id}/messages", json=msg)
        assert resp.status_code == 201

    # Get chat with messages
    resp = client.get(f"/api/v1/chats/{chat_id}")
    assert resp.status_code == 200

    body = resp.json()
    assert body["id"] == chat_id
    assert body["dataset_id"] == "testdataset"
    assert len(body["messages"]) == 3

    # Check messages are in order
    assert body["messages"][0]["content"] == "First message"
    assert body["messages"][1]["content"] == "First response"
    assert body["messages"][2]["content"] == "Second message"