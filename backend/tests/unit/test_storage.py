from pathlib import Path
import io

from app.services.storage import StorageService


def test_save_and_delete(tmp_path):
    storage = StorageService(tmp_path)
    key = "datasets/test/raw.csv"
    data = b"hello,world\n"

    size = storage.save(key, io.BytesIO(data))
    assert size == len(data)

    path = tmp_path / key
    assert path.exists()

    with storage.open(key) as f:
        assert f.read() == data

    storage.delete(key)
    assert not path.exists()
