import io

import pytest

from fastapi import HTTPException
from app.services.storage import StorageService
from app.services.datasets import DatasetService


class DummyUpload:
    def __init__(self, filename: str, content: bytes):
        self.filename = filename
        self.file = io.BytesIO(content)


def test_create_and_delete(tmp_path):
    storage = StorageService(tmp_path)
    svc = DatasetService(storage)

    upload = DummyUpload("data.csv", b"a,b\n1,2\n")
    meta = svc.create_from_upload(upload)

    assert meta.original_name == "data.csv"
    assert meta.size_bytes == len(b"a,b\n1,2\n")

    path = tmp_path / meta.storage_key
    assert path.exists()

    svc.delete(meta.dataset_id)
    assert not path.exists()

    with pytest.raises(HTTPException):
        svc.delete(meta.dataset_id)


def test_invalid_extension(tmp_path):
    storage = StorageService(tmp_path)
    svc = DatasetService(storage)
    bad = DummyUpload("evil.exe", b"x")
    with pytest.raises(HTTPException):
        svc.create_from_upload(bad)


def test_list_and_get(tmp_path):
    storage = StorageService(tmp_path)
    svc = DatasetService(storage)

    u1 = DummyUpload("a.csv", b"x\n")
    u2 = DummyUpload("b.csv", b"y\n")
    m1 = svc.create_from_upload(u1)
    svc.create_from_upload(u2)

    all_items = svc.list_all()
    assert len(all_items) == 2

    got = svc.get(m1.dataset_id)
    assert got.dataset_id == m1.dataset_id
