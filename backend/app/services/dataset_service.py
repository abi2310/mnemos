from pathlib import Path
import uuid
from typing import BinaryIO

BASE_PATH = Path("data/datasets")  # lokal – später S3 ersetzen

class DatasetService:
    def __init__(self, base_path: Path = BASE_PATH):
        self.base_path = base_path
        self.base_path.mkdir(parents=True, exist_ok=True)

    def generate_key(self, suffix: str = ".csv") -> str:
        return f"{uuid.uuid4()}{suffix}"

    def save_file(self, key: str, fileobj: BinaryIO) -> None:
        dest = self.base_path / key
        with dest.open("wb") as f:
            while chunk := fileobj.read(1024 * 1024):
                f.write(chunk)

    def delete_file(self, key: str) -> None:
        dest = self.base_path / key
        if dest.exists():
            dest.unlink()