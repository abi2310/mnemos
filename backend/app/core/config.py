from functools import lru_cache
from pathlib import Path
from dataclasses import dataclass


@dataclass
class Settings:
    storage_dir: Path = Path("./storage")
    max_upload_size: int = 50 * 1024 * 1024  # 50 MB
    allowed_extensions: tuple = (".csv", ".xlsx", ".parquet", ".json")


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    return settings
