from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "DeepFakeDetector API"
    version: str = "0.1.0"
    debug: bool = False

    # Model
    model_path: str = "./weights/best_model.pth"
    demo_mode: bool = True
    use_mock_model: bool = True

    # Upload limits
    max_upload_size_mb: int = 10

    # Rate limiting
    rate_limit_per_minute: int = 10

    # CORS — use "*" to allow any origin (fine for a public portfolio project),
    # or a comma-separated list of specific origins.
    cors_origins: str = "http://localhost:5173"

    # Storage
    database_url: str = "sqlite+aiosqlite:///./data/history.db"
    heatmap_storage_path: str = "./data/heatmaps"

    @property
    def cors_origins_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def heatmap_dir(self) -> Path:
        path = Path(self.heatmap_storage_path)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
