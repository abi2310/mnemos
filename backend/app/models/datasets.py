from datetime import datetime
from enum import Enum
from pydantic import BaseModel
from typing import Optional


class DatasetStatus(str, Enum):
    uploaded = "uploaded"
    deleted = "deleted"


class DatasetOut(BaseModel):
    dataset_id: str
    original_name: str
    size_bytes: int
    status: DatasetStatus
    created_at: datetime
    storage_key: str


class DatasetCreateResult(BaseModel):
    dataset: DatasetOut
