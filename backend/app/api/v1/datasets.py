from typing import List

from fastapi import APIRouter, Depends, File, UploadFile

from app.models.datasets import DatasetOut
from app.services.datasets import DatasetService
from app.core.dependencies import get_dataset_service


router = APIRouter()


@router.post("/datasets", response_model=DatasetOut, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...), ds_svc: DatasetService = Depends(get_dataset_service)
):
    """Upload a tabular dataset file (csv, xlsx, parquet, json)."""
    created = ds_svc.create_from_upload(file)
    return created


@router.delete("/datasets/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: str, ds_svc: DatasetService = Depends(get_dataset_service)
):
    """Delete stored dataset and its metadata."""
    ds_svc.delete(dataset_id)
    return None


@router.get("/datasets", response_model=List[DatasetOut])
async def list_datasets(ds_svc: DatasetService = Depends(get_dataset_service)):
    """Return all uploaded datasets metadata."""
    return ds_svc.list_all()


@router.get("/datasets/{dataset_id}", response_model=DatasetOut)
async def get_dataset(dataset_id: str, ds_svc: DatasetService = Depends(get_dataset_service)):
    """Return a single dataset by id."""
    return ds_svc.get(dataset_id)
