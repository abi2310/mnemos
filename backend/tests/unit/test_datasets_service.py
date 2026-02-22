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


def test_update_dataset_name(tmp_path):
    storage = StorageService(tmp_path)
    svc = DatasetService(storage)

    upload = DummyUpload("original.csv", b"a,b\n1,2\n")
    meta = svc.create_from_upload(upload)
    assert meta.original_name == "original.csv"

    # update name
    updated = svc.update(meta.dataset_id, original_name="updated.csv")
    assert updated.original_name == "updated.csv"
    assert updated.dataset_id == meta.dataset_id
    
    # verify change persisted
    got = svc.get(meta.dataset_id)
    assert got.original_name == "updated.csv"


def test_update_dataset_file(tmp_path):
    storage = StorageService(tmp_path)
    svc = DatasetService(storage)

    upload = DummyUpload("data.csv", b"a,b\n1,2\n")
    meta = svc.create_from_upload(upload)
    old_size = meta.size_bytes
    storage_key = meta.storage_key

    # update file
    new_content = b"x,y,z\n10,20,30\n"
    new_upload = DummyUpload("data.csv", new_content)
    updated = svc.update(meta.dataset_id, file=new_upload)
    
    assert updated.size_bytes == len(new_content)
    assert updated.size_bytes != old_size
    assert updated.storage_key == storage_key

    # file on disk should be updated
    path = tmp_path / storage_key
    assert path.exists()
    assert path.read_bytes() == new_content


def test_update_dataset_file_and_name(tmp_path):
    storage = StorageService(tmp_path)
    svc = DatasetService(storage)

    upload = DummyUpload("old.csv", b"a\n1\n")
    meta = svc.create_from_upload(upload)

    # update both
    new_content = b"b,c\n2,3\n"
    new_upload = DummyUpload("new.csv", new_content)
    updated = svc.update(meta.dataset_id, file=new_upload, original_name="renamed.csv")
    
    assert updated.original_name == "renamed.csv"
    assert updated.size_bytes == len(new_content)


def test_update_nonexistent_dataset(tmp_path):
    storage = StorageService(tmp_path)
    svc = DatasetService(storage)

    # try to update non-existent dataset
    with pytest.raises(HTTPException):
        svc.update("nonexistent-id", original_name="new.csv")

    def test_infer_schema_csv(tmp_path):
        from app.services.storage import StorageService
        from app.services.datasets import DatasetService

        storage = StorageService(tmp_path)
        svc = DatasetService(storage)

        csv = b"col1,col2\n1,2\n3,4\n"
        class U:
            def __init__(self, filename, content):
                self.filename = filename
                import io

                self.file = io.BytesIO(content)

        u = U("data.csv", csv)
        meta = svc.create_from_upload(u)

        schema = svc.infer_schema(meta.dataset_id)
        assert schema.dataset_id == meta.dataset_id
        assert schema.row_count == 2
        assert len(schema.columns) == 2
        assert schema.columns[0].name == "col1"
