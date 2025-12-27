import pytest
from fastapi.testclient import TestClient

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
def test_list_and_get_endpoints(client):
    # upload two datasets
    resp1 = client.post("/api/v1/datasets", files={"file": ("a.csv", "x\n", "text/csv")})
    assert resp1.status_code == 201
    d1 = resp1.json()

    resp2 = client.post("/api/v1/datasets", files={"file": ("b.csv", "y\n", "text/csv")})
    assert resp2.status_code == 201

    # list all
    list_resp = client.get("/api/v1/datasets")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert isinstance(items, list)
    assert len(items) >= 2

    # get by id
    get_resp = client.get(f"/api/v1/datasets/{d1['dataset_id']}")
    assert get_resp.status_code == 200
    got = get_resp.json()
    assert got["dataset_id"] == d1["dataset_id"]


def test_schema_endpoint(client):
    resp = client.post("/api/v1/datasets", files={"file": ("s.csv", "a,b\n1,2\n3,4\n", "text/csv")})
    assert resp.status_code == 201
    d = resp.json()

    schema_resp = client.get(f"/api/v1/datasets/{d['dataset_id']}/schema")
    assert schema_resp.status_code == 200
    body = schema_resp.json()
    assert body["dataset_id"] == d["dataset_id"]
    assert body["row_count"] == 2
    assert len(body["columns"]) == 2

