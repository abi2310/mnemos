from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.models.chat import MessageOut
from app.schemas.agent import FinalResponse, InterruptKind


class InterruptPayload(BaseModel):
    kind: InterruptKind
    question: str
    options: list[str] = Field(default_factory=list)
    reason: str | None = None


class ChatTurnResponse(BaseModel):
    status: Literal["completed", "interrupted", "error"]
    assistant_message: MessageOut | None = None
    final_response: FinalResponse | None = None
    interrupt: InterruptPayload | None = None
