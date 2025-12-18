from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from uuid import UUID, uuid4
from datetime import datetime

from app.services.dataset_service import DatasetService
from app.models.dataset import Dataset


router = APIRouter(prefix="/datasets", tags=["datasets"])

def get_storage() -> DatasetService:
    return DatasetService()


@router.post("", response_model=Dataset, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    storage: DatasetService = Depends(get_storage),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Nur CSV-Dateien sind erlaubt.")

    # Speicher-Key generieren
    key = storage.generate_key(suffix=".csv")

    # Datei speichern (streaming)
    storage.save_file(key, file.file)

    size = 0
    if file.size:
        size = file.size

    dataset_id = uuid4()
    now = datetime.utcnow()

    return Dataset(
        id=dataset_id,
        original_name=file.filename,
        size_bytes=size,
        status="uploaded",
        created_at=now,
    )
