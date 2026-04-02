from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlmodel import SQLModel

from app.core import dependencies as core_deps
from app.main import app
from app.services.chat import ChatService
from app.services.datasets import DatasetService
from app.services.projects import ProjectService
from app.services.storage import StorageService


def test_projects_can_hold_multiple_datasets_and_chats(tmp_path):
    storage = StorageService(tmp_path)
    dataset_service = DatasetService(storage)
    project_service = ProjectService()
    test_engine = create_engine(f"sqlite:///{tmp_path / 'projects.db'}", echo=False)
    project_service.engine = test_engine
    chat_service = ChatService(dataset_service=dataset_service, storage_dir=tmp_path)
    chat_service.engine = test_engine
    SQLModel.metadata.create_all(test_engine)

    app.dependency_overrides[core_deps.get_storage] = lambda: storage
    app.dependency_overrides[core_deps.get_dataset_service] = lambda: dataset_service
    app.dependency_overrides[core_deps.get_project_service] = lambda: project_service
    app.dependency_overrides[core_deps.get_chat_service] = lambda: chat_service

    try:
        with TestClient(app) as client:
            project_resp = client.post(
                "/api/v1/projects",
                json={"name": "Customer Insights", "description": "Main workspace"},
            )
            assert project_resp.status_code == 201, project_resp.text
            project = project_resp.json()

            dataset_1 = client.post(
                "/api/v1/datasets",
                files={"file": ("a.csv", "x,y\n1,2\n", "text/csv")},
                data={"project_id": str(project["id"])},
            ).json()
            dataset_2 = client.post(
                "/api/v1/datasets",
                files={"file": ("b.csv", "x,y\n3,4\n", "text/csv")},
                data={"project_id": str(project["id"])},
            ).json()

            chat_1 = client.post(
                "/api/v1/chats",
                json={"dataset_id": dataset_1["dataset_id"], "project_id": project["id"]},
            ).json()
            chat_2 = client.post(
                "/api/v1/chats",
                json={"dataset_id": dataset_2["dataset_id"], "project_id": project["id"]},
            ).json()

            get_project_resp = client.get(f"/api/v1/projects/{project['id']}")
            assert get_project_resp.status_code == 200, get_project_resp.text
            hydrated = get_project_resp.json()

            assert hydrated["dataset_ids"] == [dataset_1["dataset_id"], dataset_2["dataset_id"]]
            assert hydrated["chat_ids"] == [chat_1["id"], chat_2["id"]]
    finally:
        app.dependency_overrides.clear()
