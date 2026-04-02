from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, UploadFile, Form

from app.models.datasets import DatasetOut, DatasetSchema
from app.services.datasets import DatasetService
from app.services.projects import ProjectService
from app.core.dependencies import get_dataset_service, get_project_service


router = APIRouter()


@router.post("/datasets", response_model=DatasetOut, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    project_id: int | None = Form(None),
    ds_svc: DatasetService = Depends(get_dataset_service),
    project_svc: ProjectService = Depends(get_project_service),
):
    """Upload a tabular dataset file (csv, xlsx, parquet, json)."""
    if project_id is not None:
        project_svc.get_project(project_id)
    created = ds_svc.create_from_upload(file)
    if project_id is not None:
        project_svc.attach_dataset(project_id, created.dataset_id)
    return created


@router.delete("/datasets/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: str,
    ds_svc: DatasetService = Depends(get_dataset_service),
    project_svc: ProjectService = Depends(get_project_service),
):
    """Delete stored dataset and its metadata."""
    ds_svc.delete(dataset_id)
    project_svc.remove_dataset_references(dataset_id)
    return None


@router.get("/datasets", response_model=List[DatasetOut])
async def list_datasets(ds_svc: DatasetService = Depends(get_dataset_service)):
    """Return all uploaded datasets metadata."""
    return ds_svc.list_all()


@router.get("/datasets/{dataset_id}", response_model=DatasetOut)
async def get_dataset(dataset_id: str, ds_svc: DatasetService = Depends(get_dataset_service)):
    """Return a single dataset by id."""
    return ds_svc.get(dataset_id)


@router.put("/datasets/{dataset_id}", response_model=DatasetOut)
async def update_dataset(
    dataset_id: str,
    file: UploadFile | None = None,
    original_name: str | None = Form(None),
    use_cleaned: bool = Form(False),
    ds_svc: DatasetService = Depends(get_dataset_service),
):
    """Update dataset metadata and/or file content."""
    return ds_svc.update(dataset_id, file=file, original_name=original_name, use_cleaned=use_cleaned)


@router.get("/datasets/{dataset_id}/schema", response_model=DatasetSchema)
async def get_dataset_schema(
    dataset_id: str,
    ds_svc: DatasetService = Depends(get_dataset_service),
):
    return ds_svc.infer_schema(dataset_id)


@router.get("/datasets/{dataset_id}/preview", response_model=List[List])
async def get_dataset_preview(
    dataset_id: str,
    limit: int = 100,
    use_cleaned: bool = False,
    ds_svc: DatasetService = Depends(get_dataset_service),
):
    """Return a preview of the dataset data (columns + top rows)."""
    return ds_svc.get_preview_data(dataset_id, limit, use_cleaned=use_cleaned)

@router.get("/datasets/{dataset_id}/quality-report", response_model=Dict[str, Any])
async def get_quality_report(
    dataset_id: str, ds_svc: DatasetService = Depends(get_dataset_service)
):
    return ds_svc.get_quality_report(dataset_id)
