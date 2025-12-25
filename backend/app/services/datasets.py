from datetime import datetime
from pathlib import Path
from typing import Dict
from uuid import uuid4
import pandas as pd

from fastapi import HTTPException, UploadFile

from ..core.config import get_settings
from ..models.datasets import DatasetOut, DatasetStatus, DatasetSchema, ColumnSchema  
from .storage import StorageService




class DatasetService:
    """In-memory dataset metadata manager.

    Stores metadata in a simple dict keyed by dataset_id. Designed to be
    replaceable with a DB-backed implementation later.
    """

    def __init__(self, storage: StorageService):
        self._storage = storage
        self._store: Dict[str, DatasetOut] = {}
        self._settings = get_settings()

    def _validate_extension(self, filename: str) -> str:
        ext = Path(filename).suffix.lower()
        if ext not in self._settings.allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Extension '{ext}' not allowed")
        return ext

    def create_from_upload(self, file: UploadFile) -> DatasetOut:
        """Validate and store uploaded file, returning created metadata."""
        ext = self._validate_extension(file.filename or "")

        dataset_id = str(uuid4())
        storage_key = f"datasets/{dataset_id}/raw{ext}"

        # stream-save file to storage
        size = self._storage.save(storage_key, file.file)

        meta = DatasetOut(
            dataset_id=dataset_id,
            original_name=file.filename or "",
            size_bytes=size,
            status=DatasetStatus.uploaded,
            created_at=datetime.utcnow(),
            storage_key=storage_key,
        )

        self._store[dataset_id] = meta

        return meta

    def delete(self, dataset_id: str) -> None:
        """Delete dataset file and remove metadata. Raises HTTPException if missing."""
        meta = self._store.get(dataset_id)
        if not meta:
            raise HTTPException(status_code=404, detail="Dataset not found")
        self._storage.delete(meta.storage_key)
        # mark as deleted
        meta.status = DatasetStatus.deleted
        # remove from store for now (keeps API simple)
        del self._store[dataset_id]

    def get(self, dataset_id: str) -> DatasetOut:
        meta = self._store.get(dataset_id)
        if not meta:
            raise HTTPException(status_code=404, detail="Dataset not found")
        return meta

    def list_all(self) -> list[DatasetOut]:
        """Return a list of all stored dataset metadata."""
        return list(self._store.values())
    
    def _load_dataframe(self, meta: DatasetOut) -> pd.DataFrame:
        ext = Path(meta.storage_key).suffix.lower()
        f = self._storage.open(meta.storage_key)

        if ext == ".csv":
            df = pd.read_csv(f, nrows=10000)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(f, nrows=10000)
        elif ext == ".parquet":
            df = pd.read_parquet(f, nrows=10000)
        elif ext == ".json":
            df = pd.read_json(f, nrows=10000)
        else:
            raise HTTPException(status_code=400, detail=f"Schema-Erkennung für '{ext}' nicht unterstützt")
        
        return df
    
    def _map_dtype(self, dtype) -> str:
        if pd.api.types.is_integer_dtype(dtype):
            return "integer"
        if pd.api.types.is_float_dtype(dtype):
            return "float"
        if pd.api.types.is_bool_dtype(dtype):
            return "boolean"
        if pd.api.types.is_datetime64_any_dtype(dtype):
            return "datetime"
        return "string"
      
    def infer_schema(self, dataset_id: str) -> DatasetSchema:
        meta = self._store.get(dataset_id)
        if not meta:
            raise HTTPException(status_code=404, detail="Dataset not found")

        df = self._load_dataframe(meta)

        columns = []
        for col_name, dtype in df.dtypes.items():
            mapped = self._map_dtype(dtype)
            nullable = df[col_name].isna().any()
            columns.append(
                ColumnSchema(
                    name=col_name,
                    dtype=mapped,
                    nullable=bool(nullable),
                )
            )

        schema = DatasetSchema(
            dataset_id=dataset_id,
            row_count=int(len(df)),
            columns=columns,
        )
        return schema

