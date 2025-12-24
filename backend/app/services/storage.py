from pathlib import Path
from typing import BinaryIO
import shutil


class StorageService:
    """Simple local storage service that writes files to disk in streaming mode."""

    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _path_for_key(self, key: str) -> Path:
        return self.base_dir / key

    def save(self, key: str, stream: BinaryIO) -> int:
        """Save incoming file stream to `base_dir/key`. Returns number of bytes written."""
        path = self._path_for_key(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        total = 0
        # Write in chunks to avoid loading whole file in memory
        with open(path, "wb") as dest:
            while True:
                chunk = stream.read(1024 * 1024)
                if not chunk:
                    break
                dest.write(chunk)
                total += len(chunk)
        return total

    def delete(self, key: str) -> None:
        """Delete the stored file if it exists."""
        path = self._path_for_key(key)
        try:
            if path.exists():
                path.unlink()
        except Exception:
            # keep simple for MVP; callers can handle logging
            pass

    def open(self, key: str):
        """Open the stored file for reading (binary)."""
        path = self._path_for_key(key)
        return open(path, "rb")
