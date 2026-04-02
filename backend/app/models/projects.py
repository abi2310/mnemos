from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field
from sqlmodel import Field as SQLField, SQLModel


class ProjectDB(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    name: str
    description: str | None = SQLField(default=None)
    created_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))


class ProjectDatasetLinkDB(SQLModel, table=True):
    project_id: int = SQLField(foreign_key="projectdb.id", primary_key=True)
    dataset_id: str = SQLField(primary_key=True)
    created_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    dataset_ids: list[str] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    dataset_ids: list[str] = Field(default_factory=list)
    chat_ids: list[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
