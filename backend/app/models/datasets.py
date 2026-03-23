from datetime import datetime
from enum import Enum
from pydantic import BaseModel
from typing import List
from sqlmodel import SQLModel, Field as SQLField


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

class DatasetDB(SQLModel, table=True):
    dataset_id: str = SQLField(primary_key=True)
    original_name: str
    size_bytes: int
    status: DatasetStatus = SQLField(default=DatasetStatus.uploaded)
    created_at: datetime = SQLField(default_factory=datetime.utcnow)
    storage_key: str

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
