"""Configuration Management"""
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application Settings"""

    # Application Info
    app_name: str = "To-Docx Desktop"
    app_version: str = "1.0.0"
    debug: bool = True

    # Server Config
    host: str = "127.0.0.1"
    port: int = 8765

    # MinIO Configuration
    minio_endpoint: str = Field(default="localhost:9000", description="MinIO server endpoint")
    minio_access_key: str = Field(default="", description="MinIO access key")
    minio_secret_key: str = Field(default="", description="MinIO secret key")
    minio_bucket: str = Field(default="to-docx", description="MinIO bucket name")
    minio_secure: bool = Field(default=False, description="Use HTTPS for MinIO")
    minio_cdn_endpoint: Optional[str] = Field(default=None, description="CDN endpoint for public URLs (optional)")

    # Aliyun DashScope Configuration
    dashscope_api_key: str = Field(default="", description="Aliyun DashScope API Key")
    dashscope_model: str = Field(default="paraformer-mtl-v1", description="ASR Model")

    # File Upload Configuration
    max_upload_size: int = Field(default=500 * 1024 * 1024, description="Max upload size in bytes (500MB)")
    temp_dir: Path = Field(default_factory=lambda: Path.cwd() / "temp", description="Temporary directory")
    output_dir: Path = Field(default_factory=lambda: Path.home() / "Documents" / "ToDocx", description="Output directory")

    # Supported File Extensions
    supported_audio_formats: list[str] = Field(
        default_factory=lambda: [".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg"]
    )
    supported_video_formats: list[str] = Field(
        default_factory=lambda: [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv"]
    )
    supported_ebook_formats: list[str] = Field(
        default_factory=lambda: [".epub"]
    )

    # FFmpeg Configuration
    ffmpeg_path: Optional[str] = None  # Auto-detect if None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create directories if they don't exist
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Export settings instance
settings = get_settings()
