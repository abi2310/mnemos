import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.schemas.agent import ClarificationRequest, DatasetProfile, IntentResult, OutputMode
from app.services.analysis_agent import AnalysisAgentService
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
    class FakeDatasetService:
        def get(self, dataset_id: str):
            return type("Meta", (), {"dataset_id": dataset_id, "storage_key": "fake.csv"})()

        def _load_dataframe(self, meta, use_cleaned: bool = False, max_rows: int | None = None):
            import pandas as pd
            return pd.DataFrame({"col1": [1, 2, 3], "col2": [4, 5, 6]})

    service = ChatService(dataset_service=FakeDatasetService())
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


@pytest.fixture
def client_forced_clarification(test_db):
    """TestClient that always drives the graph into clarification interrupt."""

    class FakeDatasetService:
        def get(self, dataset_id: str):
            return type("Meta", (), {"dataset_id": dataset_id, "storage_key": "fake.csv"})()

        def _load_dataframe(self, meta, use_cleaned: bool = False, max_rows: int | None = None):
            import pandas as pd

            return pd.DataFrame({"col1": [1, 2, 3], "col2": [4, 5, 6]})

    class ForcedClarificationLLM:
        def interpret_request(self, question: str, history_text: str, profile: DatasetProfile) -> IntentResult:
            return IntentResult(
                objective=question,
                recommended_output_mode=OutputMode.CHART,
                requires_clarification=True,
                multiple_valid_solutions=True,
                ambiguity_reason="Request needs user decision.",
                candidate_approaches=["Option A", "Option B"],
                referenced_columns=[],
                confidence=0.1,
            )

        def build_clarification_request(self, question: str, intent: IntentResult, profile: DatasetProfile) -> ClarificationRequest:
            return ClarificationRequest(
                reason="Ambiguous chart objective",
                question="Welche Kennzahl soll visualisiert werden?",
                options=["col1", "col2"],
            )

        def build_analysis_plan(self, *args, **kwargs):
            raise AssertionError("build_analysis_plan should not run before clarification")

        def generate_chart_spec(self, *args, **kwargs):
            raise AssertionError("generate_chart_spec should not run before clarification")

        def generate_text_answer(self, *args, **kwargs):
            raise AssertionError("generate_text_answer should not run before clarification")

        def review_chart(self, *args, **kwargs):
            raise AssertionError("review_chart should not run before clarification")

    service = ChatService(dataset_service=FakeDatasetService())
    service.engine = test_db
    service.analysis_agent = AnalysisAgentService(
        dataset_service=service.dataset_service,
        storage_dir=get_settings().storage_dir,
        llm_service=ForcedClarificationLLM(),
    )

    app.dependency_overrides[core_deps.get_chat_service] = lambda: service

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
        "content": "Summarize col1 and col2 for this dataset"
    }
    resp = client.post(f"/api/v1/chats/{chat_id}/messages", json=message_data)
    assert resp.status_code == 201, resp.text

    body = resp.json()
    assert body["status"] == "completed"
    assert body["assistant_message"]["chat_id"] == chat_id
    assert body["assistant_message"]["role"] == "assistant"
    assert isinstance(body["assistant_message"]["content"], str)
    assert body["assistant_message"]["content"].strip() != ""
    assert body["final_response"]["status"] == "completed"


def test_add_message_returns_clarification_interrupt_for_ambiguous_chart_request(client_forced_clarification):
    """Contract test: ambiguous chart requests must interrupt for clarification, not fail."""
    chat_data = {"dataset_id": "dataset456"}
    resp = client_forced_clarification.post("/api/v1/chats", json=chat_data)
    chat_id = resp.json()["id"]

    message_data = {
        "role": "user",
        "content": "please visualize this",
    }
    resp = client_forced_clarification.post(f"/api/v1/chats/{chat_id}/messages", json=message_data)
    assert resp.status_code == 201, resp.text

    body = resp.json()
    assert body["status"] == "interrupted"
    assert body["interrupt"] is not None
    assert body["interrupt"]["kind"] == "clarification"
    assert body["interrupt"]["question"] == "Welche Kennzahl soll visualisiert werden?"
    assert body["interrupt"]["options"] == ["col1", "col2"]
    assert body["assistant_message"] is not None
    assert body["assistant_message"]["role"] == "assistant"
    assert "Welche Kennzahl" in body["assistant_message"]["content"]
    assert body["final_response"] is None


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
        {"role": "user", "content": "Summarize col1 and col2 for this dataset"},
        {"role": "assistant", "content": "2+2 equals 4."}
    ]

    for msg_data in messages_data:
        resp = client.post(f"/api/v1/chats/{chat_id}/messages", json=msg_data)
        assert resp.status_code == 201

    # Get messages
    resp = client.get(f"/api/v1/chats/{chat_id}/messages")
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert len(body) == 4
    assert body[0]["role"] == "system"
    assert body[0]["content"] == "You are a helpful assistant."
    assert body[1]["role"] == "user"
    assert body[1]["content"] == "Summarize col1 and col2 for this dataset"
    assert body[2]["role"] == "assistant"
    assert body[3]["role"] == "assistant"


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
        {"role": "user", "content": "Summarize col1 and col2 for this dataset"},
        {"role": "assistant", "content": "First response"},
        {"role": "user", "content": "Create a bar chart for col1 by col2"}
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
    assert len(body["messages"]) == 5

    # Check messages are in order and expected roles
    assert body["messages"][0]["role"] == "user"
    assert body["messages"][0]["content"] == "Summarize col1 and col2 for this dataset"
    assert body["messages"][1]["role"] == "assistant"
    assert body["messages"][2]["role"] == "assistant"
    assert body["messages"][3]["role"] == "user"
    assert body["messages"][3]["content"] == "Create a bar chart for col1 by col2"
    assert body["messages"][4]["role"] == "assistant"
