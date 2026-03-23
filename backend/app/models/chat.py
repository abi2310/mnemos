from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field
from typing import Literal
from sqlmodel import SQLModel, Field as SQLField, Relationship


# Database Models
class ChatDB(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    dataset_id: str
    created_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))

    messages: List["MessageDB"] = Relationship(back_populates="chat")


class MessageDB(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    chat_id: int = SQLField(foreign_key="chatdb.id")
    role: str  # "system", "user", "assistant"
    content: str
    created_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))

    chat: Optional[ChatDB] = Relationship(back_populates="messages")


# Pydantic Schemas for API
class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class Chat(BaseModel):
    chat_id: str
    dataset_id: str
    messages: List[ChatMessage] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ChatCreate(BaseModel):
    dataset_id: str


class ChatOut(BaseModel):
    id: int
    dataset_id: str
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class MessageOut(BaseModel):
    id: int
    chat_id: int
    role: str
    content: str
    created_at: datetime