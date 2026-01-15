from datetime import datetime
from enum import Enum
from pydantic import BaseModel

from typing import List


class ColumnSchema(BaseModel):
    name: str
    dtype: str
    nullable: bool

class DatasetSchema(BaseModel):
    dataset_id: str
    row_count: int
    columns: List[ColumnSchema]

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


class DatasetUpdate(BaseModel):
    original_name: str | None = None


class DatasetCreateResult(BaseModel):
    dataset: DatasetOut
