from typing import List

from fastapi import APIRouter, Depends

from app.core.dependencies import get_project_service
from app.models.projects import ProjectCreate, ProjectOut, ProjectUpdate
from app.services.projects import ProjectService


router = APIRouter()


@router.post("/projects", response_model=ProjectOut, status_code=201)
async def create_project(
    payload: ProjectCreate,
    project_svc: ProjectService = Depends(get_project_service),
):
    return project_svc.create_project(payload)


@router.get("/projects", response_model=List[ProjectOut])
async def list_projects(
    project_svc: ProjectService = Depends(get_project_service),
):
    return project_svc.list_projects()


@router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    project_svc: ProjectService = Depends(get_project_service),
):
    return project_svc.get_project(project_id)


@router.patch("/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    project_svc: ProjectService = Depends(get_project_service),
):
    return project_svc.update_project(project_id, payload)


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    project_svc: ProjectService = Depends(get_project_service),
):
    project_svc.delete_project(project_id)
    return None


@router.post("/projects/{project_id}/datasets/{dataset_id}", response_model=ProjectOut, status_code=201)
async def attach_dataset_to_project(
    project_id: int,
    dataset_id: str,
    project_svc: ProjectService = Depends(get_project_service),
):
    return project_svc.attach_dataset(project_id, dataset_id)
