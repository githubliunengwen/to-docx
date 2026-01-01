"""Pydantic Schemas for API"""
from typing import Optional, Literal
from pydantic import BaseModel, Field


class ConvertRequest(BaseModel):
    """File conversion request"""
    file_path: str = Field(..., description="Local file path to convert")
    output_format: Literal["docx", "md"] = Field(default="docx", description="Output format")
    title: Optional[str] = Field(None, description="Document title")
    output_filename: Optional[str] = Field(None, description="Custom output filename")
    output_dir: Optional[str] = Field(None, description="Custom output directory")


class ConvertResponse(BaseModel):
    """File conversion response"""
    success: bool
    message: str
    output_file: Optional[str] = None
    content_preview: Optional[str] = None  # First 200 characters


class SettingsRequest(BaseModel):
    """Update settings request"""
    minio_endpoint: Optional[str] = None
    minio_access_key: Optional[str] = None
    minio_secret_key: Optional[str] = None
    minio_bucket: Optional[str] = None
    minio_secure: Optional[bool] = None
    dashscope_api_key: Optional[str] = None
    output_dir: Optional[str] = None


class SettingsResponse(BaseModel):
    """Settings response"""
    minio_endpoint: str
    minio_bucket: str
    minio_secure: bool
    dashscope_configured: bool
    output_dir: str
    supported_audio_formats: list[str]
    supported_video_formats: list[str]
    supported_ebook_formats: list[str]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    app_name: str
    version: str
    minio_connected: bool
    dashscope_configured: bool
