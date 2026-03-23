from functools import lru_cache
from pathlib import Path
from dataclasses import dataclass
from dotenv import load_dotenv


@dataclass
class Settings:
    storage_dir: Path = Path("./storage")
    max_upload_size: int = 50 * 1024 * 1024  # 50 MB
    allowed_extensions: tuple = (".csv", ".xlsx", ".parquet", ".json")
    database_url: str = "sqlite:///./mnemos.db"


@lru_cache()
def get_settings() -> Settings:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(env_path)

    settings = Settings()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    return settings
