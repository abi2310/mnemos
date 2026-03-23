from typing import List
from fastapi import APIRouter, Depends, HTTPException

from app.models.chat import ChatCreate, ChatOut, MessageCreate, MessageOut
from app.services.chat import ChatService
from app.core.dependencies import get_chat_service

router = APIRouter()


@router.post("/chats", response_model=ChatOut, status_code=201)
async def create_chat(
    chat_data: ChatCreate,
    chat_svc: ChatService = Depends(get_chat_service)
):
    """Create a new chat."""
    return chat_svc.create_chat(chat_data)


@router.get("/chats/{chat_id}", response_model=dict)
async def get_chat(
    chat_id: int,
    chat_svc: ChatService = Depends(get_chat_service)
):
    """Get a chat with all its messages."""
    return chat_svc.get_chat_with_messages(chat_id)


@router.post("/chats/{chat_id}/messages", response_model=MessageOut, status_code=201)
async def add_message(
    chat_id: int,
    message_data: MessageCreate,
    chat_svc: ChatService = Depends(get_chat_service)
):
    """Add a message to a chat."""
    return chat_svc.add_message(chat_id, message_data)


@router.get("/chats/{chat_id}/messages", response_model=List[MessageOut])
async def get_messages(
    chat_id: int,
    chat_svc: ChatService = Depends(get_chat_service)
):
    """Get all messages for a chat."""
    return chat_svc.get_messages(chat_id)