"""Settings and System API Routes"""
from fastapi import APIRouter, HTTPException
from loguru import logger

from config import settings
from schemas.convert import SettingsRequest, SettingsResponse, HealthResponse
from core.minio_uploader import minio_uploader

router = APIRouter(prefix="/api/system", tags=["System"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check MinIO connection
        minio_connected = minio_uploader.client is not None
        dashscope_configured = bool(settings.dashscope_api_key)
        
        return HealthResponse(
            status="healthy",
            app_name=settings.app_name,
            version=settings.app_version,
            minio_connected=minio_connected,
            dashscope_configured=dashscope_configured
        )
    except Exception as e:
        logger.exception(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings", response_model=SettingsResponse)
async def get_settings():
    """Get current settings"""
    try:
        return SettingsResponse(
            minio_endpoint=settings.minio_endpoint,
            minio_bucket=settings.minio_bucket,
            minio_secure=settings.minio_secure,
            dashscope_configured=bool(settings.dashscope_api_key),
            output_dir=str(settings.output_dir),
            supported_audio_formats=settings.supported_audio_formats,
            supported_video_formats=settings.supported_video_formats,
            supported_ebook_formats=settings.supported_ebook_formats
        )
    except Exception as e:
        logger.exception(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings")
async def update_settings(request: SettingsRequest):
    """Update settings (runtime only, not persisted)"""
    try:
        updated_fields = []
        
        # Update MinIO settings
        if request.minio_endpoint is not None:
            settings.minio_endpoint = request.minio_endpoint
            updated_fields.append("minio_endpoint")
        
        if request.minio_access_key is not None:
            settings.minio_access_key = request.minio_access_key
            updated_fields.append("minio_access_key")
        
        if request.minio_secret_key is not None:
            settings.minio_secret_key = request.minio_secret_key
            updated_fields.append("minio_secret_key")
        
        if request.minio_bucket is not None:
            settings.minio_bucket = request.minio_bucket
            updated_fields.append("minio_bucket")
        
        if request.minio_secure is not None:
            settings.minio_secure = request.minio_secure
            updated_fields.append("minio_secure")
        
        # Update DashScope settings
        if request.dashscope_api_key is not None:
            settings.dashscope_api_key = request.dashscope_api_key
            import dashscope
            dashscope.api_key = request.dashscope_api_key
            updated_fields.append("dashscope_api_key")
        
        # Update output directory
        if request.output_dir is not None:
            from pathlib import Path
            settings.output_dir = Path(request.output_dir)
            settings.output_dir.mkdir(parents=True, exist_ok=True)
            updated_fields.append("output_dir")
        
        logger.info(f"Settings updated: {', '.join(updated_fields)}")
        
        return {
            "success": True,
            "message": f"Settings updated: {', '.join(updated_fields)}",
            "updated_fields": updated_fields
        }
        
    except Exception as e:
        logger.exception(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

