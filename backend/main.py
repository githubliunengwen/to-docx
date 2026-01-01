"""FastAPI Application Entry Point"""
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from config import settings
from utils.logger import setup_logger
from routes import convert, system, license

# Setup logger
setup_logger()

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Desktop application for converting files to DOCX/Markdown",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS middleware (allow Electron frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(convert.router)
app.include_router(system.router)
app.include_router(license.router)


@app.on_event("startup")
async def startup_event():
    """Application startup"""
    import os

    logger.info(f"🚀 {settings.app_name} v{settings.app_version} starting...")
    logger.info(f"📁 Output directory: {settings.output_dir}")
    logger.info(f"📁 Temp directory: {settings.temp_dir}")
    logger.info(f"🔧 Debug mode: {settings.debug}")

    # Check activation status
    from utils.license import check_activation
    activation = check_activation()
    if activation["activated"]:
        logger.info(f"✅ Software activated (Expire: {activation['expire_date']})")
    else:
        logger.warning(f"⚠️  Software not activated - Machine code: {activation['machine_code']}")
        logger.warning(f"⚠️  {activation['message']}")

    # Check configurations
    if settings.minio_endpoint and settings.minio_access_key:
        logger.info(f"✅ MinIO configured: {settings.minio_endpoint}/{settings.minio_bucket}")
    else:
        logger.warning("⚠️  MinIO not configured - file upload will not work")

    # 检查 DashScope API 密钥（优先从激活码获取的环境变量）
    dashscope_api_key = os.environ.get("DASHSCOPE_API_KEY") or settings.dashscope_api_key
    if dashscope_api_key:
        logger.info("✅ DashScope API configured (from license activation)")
    else:
        logger.warning("⚠️  DashScope API not configured - audio transcription will not work")
        logger.warning("⚠️  Please activate the software to enable audio transcription")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info(f"🛑 {settings.app_name} shutting down...")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs" if settings.debug else "disabled"
    }


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting server on {settings.host}:{settings.port}")

    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="debug" if settings.debug else "info"
    )
