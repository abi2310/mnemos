from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, cast

from sqlalchemy import asc
from sqlmodel import Session, create_engine, select
from fastapi import HTTPException

from ..core.config import get_settings
from ..models.chat import ChatDB, MessageDB, ChatCreate, ChatOut, MessageCreate, MessageOut
from ..schemas.agent import ChatHistoryItem, OutputMode
from ..schemas.chat_api import ChatTurnResponse
from ..services.analysis_agent import AnalysisAgentService
from ..services.datasets import DatasetService


class ChatService:
    def __init__(self, dataset_service: DatasetService | None = None, storage_dir: Path | None = None):
        settings = get_settings()
        self.engine = create_engine(settings.database_url, echo=False)
        self.dataset_service = dataset_service
        self.storage_dir = storage_dir or settings.storage_dir
        self.analysis_agent = (
            AnalysisAgentService(dataset_service=dataset_service, storage_dir=self.storage_dir)
            if dataset_service is not None
            else None
        )

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

    def add_message(self, chat_id: int, message_data: MessageCreate) -> ChatTurnResponse:
        """Add a message to a chat and run or resume the LangGraph workflow for user turns."""
        with Session(self.engine) as session:
            chat = session.get(ChatDB, chat_id)
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")

            persisted_message = self._create_message(
                session=session,
                chat_id=chat_id,
                role=message_data.role,
                content=message_data.content,
            )

            chat.updated_at = datetime.now(timezone.utc)
            session.add(chat)
            session.commit()

            if message_data.role != "user":
                return ChatTurnResponse(
                    status="completed",
                    assistant_message=self._message_to_out(persisted_message),
                    final_response=None,
                    interrupt=None,
                )

            if not self.dataset_service or self.analysis_agent is None:
                raise HTTPException(status_code=500, detail="Agent dependencies are not configured")

            ordered_messages = session.exec(
                select(MessageDB).where(MessageDB.chat_id == chat_id).order_by(asc(cast(Any, MessageDB.created_at)))
            ).all()
            history_items = [
                ChatHistoryItem(role=message.role, content=message.content)
                for message in ordered_messages[:-1]
                if message.role in {"system", "user", "assistant"}
            ]

            pending_interrupt = self.analysis_agent.has_pending_interrupt(chat_id)
            should_attempt_resume = pending_interrupt or self._last_assistant_looks_like_clarification(ordered_messages)

            if should_attempt_resume:
                try:
                    execution_result = self.analysis_agent.resume(chat_id, message_data.content)
                except Exception:
                    execution_result = self.analysis_agent.run(
                        chat_id=chat_id,
                        dataset_id=chat.dataset_id,
                        user_question=message_data.content,
                        chat_history=history_items,
                    )
            else:
                execution_result = self.analysis_agent.run(
                    chat_id=chat_id,
                    dataset_id=chat.dataset_id,
                    user_question=message_data.content,
                    chat_history=history_items,
                )

            assistant_content = self._assistant_content_from_execution(execution_result)
            generated_image = None
            if execution_result.final_response and execution_result.final_response.output_mode == OutputMode.CHART:
                generated_image = execution_result.final_response.artifacts[0].path if execution_result.final_response.artifacts else None

            assistant_message = self._create_message(
                session=session,
                chat_id=chat_id,
                role="assistant",
                content=assistant_content,
                generated_code=None,
                generated_image=generated_image,
            )

            return ChatTurnResponse(
                status=execution_result.status,  # type: ignore[arg-type]
                assistant_message=self._message_to_out(assistant_message),
                final_response=execution_result.final_response,
                interrupt=execution_result.interrupt,
            )

    def get_messages(self, chat_id: int) -> List[MessageOut]:
        """Get all messages for a chat."""
        with Session(self.engine) as session:
            chat = session.get(ChatDB, chat_id)
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")

            statement = select(MessageDB).where(MessageDB.chat_id == chat_id).order_by(asc(cast(Any, MessageDB.created_at)))
            messages = session.exec(statement).all()
            return [self._message_to_out(msg) for msg in messages]

    def _assistant_content_from_execution(self, execution_result) -> str:
        if execution_result.interrupt is not None:
            options = ", ".join(execution_result.interrupt.options)
            suffix = f" Optionen: {options}" if options else ""
            return f"{execution_result.interrupt.question}{suffix}"
        if execution_result.final_response is not None:
            return execution_result.final_response.message
        return "(keine Antwort generiert)"

    def _last_assistant_looks_like_clarification(self, messages: list[MessageDB]) -> bool:
        if not messages:
            return False

        for message in reversed(messages):
            if message.role != "assistant":
                continue
            text = message.content.lower()
            return (
                "welche felder soll ich verwenden" in text
                or "ich benötige eine klärung" in text
                or "welche" in text and "spalte" in text
                or "optionen:" in text
            )
        return False
