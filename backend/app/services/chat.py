from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, cast
from uuid import uuid4

from sqlalchemy import asc
from sqlmodel import Session, select, create_engine
from fastapi import HTTPException

from ..core.config import get_settings
from ..models.chat import ChatDB, MessageDB, ChatCreate, ChatOut, MessageCreate, MessageOut
from ..services.datasets import DatasetService
from ..services.llm_agent import LLMAgent


class ChatService:
    def __init__(self, dataset_service: DatasetService | None = None, llm_agent: LLMAgent | None = None):
        settings = get_settings()
        self.engine = create_engine(settings.database_url, echo=False)
        self.dataset_service = dataset_service
        self.llm_agent = llm_agent or LLMAgent()
        self.storage_dir = settings.storage_dir

    def create_tables(self):
        """Create all tables if they don't exist."""
        from sqlmodel import SQLModel

        SQLModel.metadata.create_all(self.engine)

    def _message_to_out(self, message: MessageDB) -> MessageOut:
        assert message.id is not None
        return MessageOut(
            id=message.id,
            chat_id=message.chat_id,
            role=message.role,
            content=message.content,
            created_at=message.created_at,
            generated_code=message.generated_code if hasattr(message, 'generated_code') else None,
            generated_image=message.generated_image if hasattr(message, 'generated_image') else None,
        )

    def _create_message(self, session: Session, chat_id: int, role: str, content: str, generated_code: str | None = None, generated_image: str | None = None) -> MessageDB:
        message = MessageDB(
            chat_id=chat_id,
            role=role,
            content=content,
            generated_code=generated_code,
            generated_image=generated_image,
        )
        session.add(message)
        session.commit()
        session.refresh(message)
        return message

    def _fetch_dataset(self, dataset_id: str):
        if not self.dataset_service:
            raise HTTPException(status_code=500, detail="Dataset service is not configured")
        meta = self.dataset_service.get(dataset_id)
        return self.dataset_service._load_dataframe(meta)

    def _build_generated_image_location(self, chat_id: int) -> tuple[str, str]:
        relative_key = Path("images") / str(chat_id) / f"{uuid4().hex}.png"
        absolute_path = self.storage_dir / relative_key
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        public_url = f"/storage/{relative_key.as_posix()}"
        return str(absolute_path), public_url

    def create_chat(self, chat_data: ChatCreate) -> ChatOut:
        """Create a new chat."""
        with Session(self.engine) as session:
            chat = ChatDB(
                dataset_id=chat_data.dataset_id
            )
            session.add(chat)
            session.commit()
            session.refresh(chat)
            assert chat.id is not None
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
            assert chat.id is not None
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
            statement = select(MessageDB).where(MessageDB.chat_id == chat_id).order_by(asc(cast(Any, MessageDB.created_at)))
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
                        "created_at": msg.created_at,
                        "generated_code": msg.generated_code,
                        "generated_image": msg.generated_image,
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

            # Persist user message in chat
            user_message = self._create_message(
                session=session,
                chat_id=chat_id,
                role=message_data.role,
                content=message_data.content,
            )

            # Update chat's updated_at
            chat.updated_at = datetime.now(timezone.utc)
            session.add(chat)
            session.commit()

            assistant_content = None
            generated_code = None
            generated_image = None

            if message_data.role == "user":
                dataset_df = self._fetch_dataset(chat.dataset_id)
                message_history = "\n".join(
                    [f"{m.role}: {m.content}" for m in session.exec(
                        select(MessageDB).where(MessageDB.chat_id == chat_id).order_by(asc(cast(Any, MessageDB.created_at)))
                    ).all()]
                )
                llm_action = self.llm_agent.choose_action(message_data.content, message_history, dataset_df)

                if llm_action["type"] == "diagram":
                    generated_code = llm_action.get("python_code")
                    assistant_content = llm_action.get("assistant_text")
                    if generated_code:
                        image_path, public_url = self._build_generated_image_location(chat_id)
                        self.llm_agent.execute_code(generated_code, dataset_df, image_path)
                        image_review = self.llm_agent.review_rendered_image(
                            message_data.content,
                            message_history,
                            dataset_df,
                            image_path,
                            generated_code,
                        )
                        revised_code = image_review.get("python_code")
                        if image_review.get("approved") is False and isinstance(revised_code, str) and revised_code.strip():
                            generated_code = revised_code
                            self.llm_agent.execute_code(generated_code, dataset_df, image_path)
                            issues = image_review.get("issues", [])
                            issue_text = ", ".join(str(issue) for issue in issues) if issues else "visuelle Probleme"
                            assistant_content = (
                                (assistant_content or "Ich habe ein Diagramm erstellt.")
                                + f" Die Visualisierung wurde nach Bild-Review einmal neu generiert ({issue_text})."
                            )
                        generated_image = public_url
                else:
                    assistant_content = llm_action.get("assistant_text")

            elif message_data.role == "assistant":
                assistant_content = message_data.content

            if assistant_content is None:
                assistant_content = "(keine Antwort generiert)"

            assistant_message = self._create_message(
                session=session,
                chat_id=chat_id,
                role="assistant",
                content=assistant_content,
                generated_code=generated_code,
                generated_image=generated_image,
            )

            return self._message_to_out(assistant_message)

    def get_messages(self, chat_id: int) -> List[MessageOut]:
        """Get all messages for a chat."""
        with Session(self.engine) as session:
            # Check if chat exists
            chat = session.get(ChatDB, chat_id)
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")

            statement = select(MessageDB).where(MessageDB.chat_id == chat_id).order_by(asc(cast(Any, MessageDB.created_at)))
            messages = session.exec(statement).all()
            return [self._message_to_out(msg) for msg in messages]
