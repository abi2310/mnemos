import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure backend is importable
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.main import app
from app.services.storage import StorageService
from app.services.datasets import DatasetService
from app.core import dependencies as core_deps


@pytest.fixture
def client(tmp_path):
    """TestClient with overridden storage and dataset service using a temp dir."""
    storage = StorageService(tmp_path)
    ds_svc = DatasetService(storage)

    # override dependencies so they share the temp storage
    app.dependency_overrides[core_deps.get_storage] = lambda: storage
    app.dependency_overrides[core_deps.get_dataset_service] = lambda: ds_svc

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def test_upload_csv_and_delete(client, tmp_path):
    data = "a,b\n1,2\n"
    files = {"file": ("data.csv", data, "text/csv")}

    # upload
    resp = client.post("/api/v1/datasets", files=files)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert "dataset_id" in body
    assert body["original_name"] == "data.csv"
    assert body["size_bytes"] == len(data.encode())
    dataset_id = body["dataset_id"]

    # file should be present on disk
    storage_key = body["storage_key"]
    path = tmp_path / storage_key
    assert path.exists()

    # delete
    resp2 = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert resp2.status_code == 204
    # file removed
    assert not path.exists()

    # subsequent delete -> 404
    resp3 = client.delete(f"/api/v1/datasets/{dataset_id}")
    assert resp3.status_code == 404


def test_invalid_extension_returns_400(client):
    files = {"file": ("data.exe", b"mal", "application/octet-stream")}
    resp = client.post("/api/v1/datasets", files=files)
    assert resp.status_code == 400
