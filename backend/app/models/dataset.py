from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class Dataset(BaseModel):
    id: UUID
    original_name: str
    size_bytes: int
    status: str
    created_at: datetime
