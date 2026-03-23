from datetime import datetime, timezone
from typing import List
from sqlmodel import Session, select, create_engine
from fastapi import HTTPException

from ..core.config import get_settings
from ..models.chat import ChatDB, MessageDB, ChatCreate, ChatOut, MessageCreate, MessageOut


class ChatService:
    def __init__(self):
        settings = get_settings()
        self.engine = create_engine(settings.database_url, echo=False)

    def create_tables(self):
        """Create all tables if they don't exist."""
        from sqlmodel import SQLModel

        SQLModel.metadata.create_all(self.engine)

    def create_chat(self, chat_data: ChatCreate) -> ChatOut:
        """Create a new chat."""
        with Session(self.engine) as session:
            chat = ChatDB(
                dataset_id=chat_data.dataset_id
            )
            session.add(chat)
            session.commit()
            session.refresh(chat)
            return ChatOut(
                id=chat.id,
                dataset_id=chat.dataset_id,
                created_at=chat.created_at,
                updated_at=chat.updated_at
            )

    def get_chat(self, chat_id: int) -> ChatOut:
        """Get a chat by ID."""
        with Session(self.engine) as session:
            chat = session.get(ChatDB, chat_id)
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")
            return ChatOut(
                id=chat.id,
                dataset_id=chat.dataset_id,
                created_at=chat.created_at,
                updated_at=chat.updated_at
            )

    def get_chat_with_messages(self, chat_id: int) -> dict:
        """Get a chat with all its messages."""
        with Session(self.engine) as session:
            chat = session.get(ChatDB, chat_id)
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")

            # Load messages
            statement = select(MessageDB).where(MessageDB.chat_id == chat_id).order_by(MessageDB.created_at)
            messages = session.exec(statement).all()

            return {
                "id": chat.id,
                "dataset_id": chat.dataset_id,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at,
                "messages": [
                    {
                        "id": msg.id,
                        "role": msg.role,
                        "content": msg.content,
                        "created_at": msg.created_at
                    } for msg in messages
                ]
            }

    def add_message(self, chat_id: int, message_data: MessageCreate) -> MessageOut:
        """Add a message to a chat and update the chat's updated_at."""
        with Session(self.engine) as session:
            # Check if chat exists
            chat = session.get(ChatDB, chat_id)
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")

            # Create message
            message = MessageDB(
                chat_id=chat_id,
                role=message_data.role,
                content=message_data.content
            )
            session.add(message)

            # Update chat's updated_at
            chat.updated_at = datetime.now(timezone.utc)
            session.add(chat)

            session.commit()
            session.refresh(message)

            return MessageOut(
                id=message.id,
                chat_id=message.chat_id,
                role=message.role,
                content=message.content,
                created_at=message.created_at
            )

    def get_messages(self, chat_id: int) -> List[MessageOut]:
        """Get all messages for a chat."""
        with Session(self.engine) as session:
            # Check if chat exists
            chat = session.get(ChatDB, chat_id)
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")

            statement = select(MessageDB).where(MessageDB.chat_id == chat_id).order_by(MessageDB.created_at)
            messages = session.exec(statement).all()

            return [
                MessageOut(
                    id=msg.id,
                    chat_id=msg.chat_id,
                    role=msg.role,
                    content=msg.content,
                    created_at=msg.created_at
                ) for msg in messages
            ]