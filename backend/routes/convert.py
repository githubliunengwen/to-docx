"""Conversion API Routes"""
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from loguru import logger

from config import settings
from schemas.convert import ConvertRequest, ConvertResponse
from core.audio_processor import audio_processor
from core.epub_processor import epub_processor
from core.document_generator import document_generator

router = APIRouter(prefix="/api/convert", tags=["Convert"])


def detect_file_type(file_path: Path) -> Literal["audio", "video", "epub", "unknown"]:
    """Detect file type by extension"""
    suffix = file_path.suffix.lower()

    if suffix in settings.supported_audio_formats:
        return "audio"
    elif suffix in settings.supported_video_formats:
        return "video"
    elif suffix in settings.supported_ebook_formats:
        return "epub"
    else:
        return "unknown"


@router.post("/file", response_model=ConvertResponse)
async def convert_file(request: ConvertRequest):
    """
    Convert file to DOCX or Markdown

    Supports:
    - Audio files → Text → DOCX/MD
    - Video files → Audio → Text → DOCX/MD
    - EPUB files → Text → DOCX/MD
    """
    from utils.quota_manager import quota_manager
    from utils.license import check_activation
    import time

    try:
        # 检查激活状态和额度
        activation_status = check_activation()
        if not activation_status["activated"]:
            raise HTTPException(
                status_code=403,
                detail=f"api调用额度用尽，或激活码已失效"
            )

        # 检查额度是否充足
        quota_check = quota_manager.check_quota(0)
        if not quota_check["sufficient"]:
            raise HTTPException(
                status_code=403,
                detail=quota_check['message']
            )

        file_path = Path(request.file_path)

        # Check file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

        # Detect file type
        file_type = detect_file_type(file_path)
        logger.info(f"Processing file: {file_path.name} (type: {file_type})")

        # Extract text based on file type
        text_content = None

        if file_type == "audio" or file_type == "video":
            # Audio/Video → Text (需要计费)
            audio_duration_seconds = 0  # 音频文件的实际时长

            if file_type == "audio":
                logger.debug("Processing audio file...")
                result = audio_processor.transcribe_audio(file_path)
                if result:
                    text_content, audio_duration_seconds = result
                else:
                    text_content = None
            else:
                logger.debug("Extracting audio from video...")
                audio_file = audio_processor.extract_audio_from_video(file_path)
                if audio_file:
                    logger.debug("Transcribing extracted audio...")
                    result = audio_processor.transcribe_audio(audio_file)
                    if result:
                        text_content, audio_duration_seconds = result
                    else:
                        text_content = None
                else:
                    raise HTTPException(status_code=500, detail="Failed to extract audio from video")

            # 只有转换成功才扣除额度
            if not text_content:
                raise HTTPException(status_code=500, detail="Failed to transcribe audio")

            # 使用音频文件的实际时长来扣减额度（而不是处理耗时）
            if audio_duration_seconds > 0:
                logger.info(f"Audio duration for billing: {audio_duration_seconds / 60:.2f} minutes ({audio_duration_seconds / 3600:.2f} hours)")
                quota_result = quota_manager.consume_quota(audio_duration_seconds)
                if not quota_result["success"]:
                    logger.warning(f"Failed to consume quota: {quota_result['message']}")
                else:
                    logger.info(f"Quota consumed: {quota_result.get('consumed', 0):.4f} yuan, Remaining: {quota_result['remaining_quota']:.4f} yuan")
            else:
                logger.warning("Audio duration not available, skipping quota consumption")

        elif file_type == "epub":
            # EPUB → Text (不计费)
            logger.debug("Extracting text from EPUB...")
            text_content = epub_processor.extract_text(file_path)

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_path.suffix}"
            )

        # Check if text extraction succeeded
        if not text_content:
            raise HTTPException(status_code=500, detail="Failed to extract text from file")

        # Generate document
        output_file = None
        if request.output_format == "docx":
            output_file = document_generator.generate_docx(
                content=text_content,
                title=request.title or file_path.stem,
                output_filename=request.output_filename,
                output_dir=request.output_dir
            )
        else:  # markdown
            output_file = document_generator.generate_markdown(
                content=text_content,
                title=request.title or file_path.stem,
                output_filename=request.output_filename,
                output_dir=request.output_dir
            )

        if not output_file:
            raise HTTPException(status_code=500, detail="Failed to generate document")

        # 获取最新的额度信息
        quota_info = quota_manager.get_quota_info()
        remaining_quota = quota_info.get("remaining_quota", 0) if quota_info else 0

        # 确保返回绝对路径
        output_file_abs = str(output_file.resolve() if hasattr(output_file, 'resolve') else output_file)
        logger.info(f"Output file path: {output_file_abs}")

        # Return response
        return ConvertResponse(
            success=True,
            message=f"File converted successfully to {request.output_format.upper()}. Remaining quota: {remaining_quota:.4f} yuan",
            output_file=output_file_abs,
            content_preview=text_content[:200] if text_content else None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error converting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{filename}")
async def download_file(filename: str):
    """Download generated file"""
    try:
        file_path = settings.output_dir / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type='application/octet-stream'
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))
