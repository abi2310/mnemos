from functools import lru_cache
from app.core.config import get_settings
from app.services.storage import StorageService
from app.services.datasets import DatasetService
from app.services.chat import ChatService


@lru_cache()
def get_storage() -> StorageService:
    settings = get_settings()
    return StorageService(settings.storage_dir)


@lru_cache()
def get_dataset_service() -> DatasetService:
    storage = get_storage()
    return DatasetService(storage)


def get_chat_service() -> ChatService:
    return ChatService()
