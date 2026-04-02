from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, cast

from fastapi import HTTPException
from sqlalchemy import asc, create_engine, desc
from sqlmodel import Session, SQLModel, select

from app.core.config import get_settings
from app.models.chat import ChatDB
from app.models.projects import ProjectCreate, ProjectDatasetLinkDB, ProjectDB, ProjectOut, ProjectUpdate


class ProjectService:
    def __init__(self):
        settings = get_settings()
        self.engine = create_engine(settings.database_url, echo=False)

    def create_tables(self) -> None:
        from app.models import chat as _chat_models  # noqa: F401
        from app.models import projects as _project_models  # noqa: F401

        SQLModel.metadata.create_all(self.engine)

    def create_project(self, payload: ProjectCreate) -> ProjectOut:
        with Session(self.engine) as session:
            project = ProjectDB(name=payload.name, description=payload.description)
            session.add(project)
            session.commit()
            session.refresh(project)
            assert project.id is not None
            for dataset_id in payload.dataset_ids:
                existing = session.get(ProjectDatasetLinkDB, (project.id, dataset_id))
                if existing is None:
                    session.add(ProjectDatasetLinkDB(project_id=project.id, dataset_id=dataset_id))
            project.updated_at = datetime.now(timezone.utc)
            session.add(project)
            session.commit()
            return self._to_out(session, project)

    def list_projects(self) -> list[ProjectOut]:
        with Session(self.engine) as session:
            projects = session.exec(
                select(ProjectDB).order_by(desc(cast(Any, ProjectDB.created_at)))
            ).all()
            return [self._to_out(session, project) for project in projects]

    def get_project(self, project_id: int) -> ProjectOut:
        with Session(self.engine) as session:
            project = session.get(ProjectDB, project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
            return self._to_out(session, project)

    def update_project(self, project_id: int, payload: ProjectUpdate) -> ProjectOut:
        with Session(self.engine) as session:
            project = session.get(ProjectDB, project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            if payload.name is not None:
                project.name = payload.name
            if payload.description is not None:
                project.description = payload.description
            project.updated_at = datetime.now(timezone.utc)

            session.add(project)
            session.commit()
            session.refresh(project)
            return self._to_out(session, project)

    def delete_project(self, project_id: int) -> None:
        with Session(self.engine) as session:
            project = session.get(ProjectDB, project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            links = session.exec(
                select(ProjectDatasetLinkDB).where(ProjectDatasetLinkDB.project_id == project_id)
            ).all()
            for link in links:
                session.delete(link)

            chats = session.exec(select(ChatDB).where(ChatDB.project_id == project_id)).all()
            for chat in chats:
                chat.project_id = None
                chat.updated_at = datetime.now(timezone.utc)
                session.add(chat)

            session.delete(project)
            session.commit()

    def attach_dataset(self, project_id: int, dataset_id: str) -> ProjectOut:
        with Session(self.engine) as session:
            project = session.get(ProjectDB, project_id)
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            existing = session.get(ProjectDatasetLinkDB, (project_id, dataset_id))
            if existing is None:
                session.add(ProjectDatasetLinkDB(project_id=project_id, dataset_id=dataset_id))
                project.updated_at = datetime.now(timezone.utc)
                session.add(project)
                session.commit()
                session.refresh(project)

            return self._to_out(session, project)

    def remove_dataset_references(self, dataset_id: str) -> None:
        with Session(self.engine) as session:
            links = session.exec(
                select(ProjectDatasetLinkDB).where(ProjectDatasetLinkDB.dataset_id == dataset_id)
            ).all()
            affected_project_ids = {link.project_id for link in links}
            for link in links:
                session.delete(link)
            if affected_project_ids:
                projects = session.exec(
                    select(ProjectDB).where(cast(Any, ProjectDB.id).in_(affected_project_ids))
                ).all()
                for project in projects:
                    project.updated_at = datetime.now(timezone.utc)
                    session.add(project)
            session.commit()

    def _to_out(self, session: Session, project: ProjectDB) -> ProjectOut:
        dataset_links = session.exec(
            select(ProjectDatasetLinkDB)
            .where(ProjectDatasetLinkDB.project_id == project.id)
            .order_by(asc(cast(Any, ProjectDatasetLinkDB.created_at)))
        ).all()
        chats = session.exec(
            select(ChatDB).where(ChatDB.project_id == project.id).order_by(asc(cast(Any, ChatDB.created_at)))
        ).all()
        assert project.id is not None
        return ProjectOut(
            id=project.id,
            name=project.name,
            description=project.description,
            dataset_ids=[link.dataset_id for link in dataset_links],
            chat_ids=[chat.id for chat in chats if chat.id is not None],
            created_at=project.created_at,
            updated_at=project.updated_at,
        )
