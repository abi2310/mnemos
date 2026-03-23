import pytest
from sqlalchemy import create_engine
from sqlmodel import Session, SQLModel
from fastapi import HTTPException

from app.services.chat import ChatService
from app.models.chat import ChatCreate, MessageCreate


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing."""
    from app.models.chat import ChatDB, MessageDB  # Import to register models
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def chat_service(test_db):
    """Create a ChatService with test database."""
    service = ChatService()
    service.engine = test_db  # Override the engine for testing
    service.create_tables()
    return service


def test_create_chat(chat_service):
    """Test creating a new chat."""
    chat_data = ChatCreate(dataset_id="dataset456")
    chat = chat_service.create_chat(chat_data)

    assert chat.id is not None
    assert chat.dataset_id == "dataset456"
    assert chat.created_at is not None
    assert chat.updated_at is not None


def test_get_chat(chat_service):
    """Test getting a chat by ID."""
    chat_data = ChatCreate(dataset_id="dataset456")
    created_chat = chat_service.create_chat(chat_data)

    retrieved_chat = chat_service.get_chat(created_chat.id)

    assert retrieved_chat.id == created_chat.id
    assert retrieved_chat.dataset_id == "dataset456"


def test_get_nonexistent_chat(chat_service):
    """Test getting a non-existent chat raises 404."""
    with pytest.raises(HTTPException) as exc_info:
        chat_service.get_chat(999)
    assert exc_info.value.status_code == 404
    assert "Chat not found" in str(exc_info.value.detail)


def test_get_chat_with_messages(chat_service):
    """Test getting a chat with its messages."""
    chat_data = ChatCreate(dataset_id="dataset456")
    created_chat = chat_service.create_chat(chat_data)

    # Add some messages
    msg1 = MessageCreate(role="user", content="Hello")
    msg2 = MessageCreate(role="assistant", content="Hi there")

    chat_service.add_message(created_chat.id, msg1)
    chat_service.add_message(created_chat.id, msg2)

    chat_with_messages = chat_service.get_chat_with_messages(created_chat.id)

    assert chat_with_messages["id"] == created_chat.id
    assert len(chat_with_messages["messages"]) == 2
    assert chat_with_messages["messages"][0]["role"] == "user"
    assert chat_with_messages["messages"][0]["content"] == "Hello"
    assert chat_with_messages["messages"][1]["role"] == "assistant"
    assert chat_with_messages["messages"][1]["content"] == "Hi there"


def test_add_message(chat_service):
    """Test adding a message to a chat."""
    chat_data = ChatCreate(dataset_id="dataset456")
    created_chat = chat_service.create_chat(chat_data)

    msg_data = MessageCreate(role="user", content="Test message")
    message = chat_service.add_message(created_chat.id, msg_data)

    assert message.id is not None
    assert message.chat_id == created_chat.id
    assert message.role == "user"
    assert message.content == "Test message"
    assert message.created_at is not None


def test_add_message_updates_chat_timestamp(chat_service):
    """Test that adding a message updates the chat's updated_at."""
    chat_data = ChatCreate(dataset_id="dataset456")
    created_chat = chat_service.create_chat(chat_data)

    original_updated_at = created_chat.updated_at

    msg_data = MessageCreate(role="user", content="Test message")
    chat_service.add_message(created_chat.id, msg_data)

    # Get the chat again to check updated_at
    updated_chat = chat_service.get_chat(created_chat.id)
    assert updated_chat.updated_at > original_updated_at


def test_add_message_to_nonexistent_chat(chat_service):
    """Test adding a message to a non-existent chat raises 404."""
    msg_data = MessageCreate(role="user", content="Test")
    with pytest.raises(HTTPException) as exc_info:
        chat_service.add_message(999, msg_data)
    assert exc_info.value.status_code == 404
    assert "Chat not found" in str(exc_info.value.detail)


def test_get_messages(chat_service):
    """Test getting all messages for a chat."""
    chat_data = ChatCreate(dataset_id="dataset456")
    created_chat = chat_service.create_chat(chat_data)

    # Add messages
    messages_data = [
        MessageCreate(role="system", content="System prompt"),
        MessageCreate(role="user", content="User question"),
        MessageCreate(role="assistant", content="Assistant answer"),
    ]

    for msg_data in messages_data:
        chat_service.add_message(created_chat.id, msg_data)

    messages = chat_service.get_messages(created_chat.id)

    assert len(messages) == 3
    assert messages[0].role == "system"
    assert messages[1].role == "user"
    assert messages[2].role == "assistant"

    # Check ordering by created_at
    assert messages[0].created_at <= messages[1].created_at <= messages[2].created_at


def test_get_messages_for_nonexistent_chat(chat_service):
    """Test getting messages for a non-existent chat raises 404."""
    with pytest.raises(HTTPException) as exc_info:
        chat_service.get_messages(999)
    assert exc_info.value.status_code == 404
    assert "Chat not found" in str(exc_info.value.detail)