"""Audio Processor - Extract text from audio files"""
import subprocess
import os
from pathlib import Path
from typing import Optional

import dashscope
import requests
from loguru import logger

from config import settings
from core.minio_uploader import minio_uploader


class AudioProcessor:
    """Audio Processing and Speech Recognition"""

    # DashScope API限制：音频文件不超过2GB，时长12小时以内
    MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
    MAX_DURATION = 12 * 3600  # 12小时（秒）

    def __init__(self):
        """Initialize audio processor"""
        # 优先从环境变量获取API密钥（从激活码解密得到）
        api_key = os.environ.get("DASHSCOPE_API_KEY") or settings.dashscope_api_key
        if api_key:
            dashscope.api_key = api_key
        else:
            logger.warning("DashScope API key not configured")

    def _get_api_key(self) -> Optional[str]:
        """
        获取 DashScope API 密钥
        优先从环境变量获取（激活码解密后设置的），其次从配置文件获取

        Returns:
            API密钥字符串，如果未配置则返回None
        """
        return os.environ.get("DASHSCOPE_API_KEY") or settings.dashscope_api_key

    def compress_audio(self, audio_file: Path, target_bitrate: str = "64k") -> Optional[Path]:
        """
        压缩音频文件

        注意：paraformer-mtl-v1模型支持16kHz及以上采样率

        Args:
            audio_file: 原始音频文件路径
            target_bitrate: 目标比特率，默认64k

        Returns:
            压缩后的音频文件路径，失败返回None
        """
        try:
            compressed_dir = settings.temp_dir / "compressed"
            compressed_dir.mkdir(exist_ok=True)

            compressed_file = compressed_dir / f"{audio_file.stem}_compressed.mp3"

            cmd = [
                "ffmpeg",
                "-y",
                "-i", str(audio_file),
                "-acodec", "libmp3lame",  # 使用MP3编码
                "-b:a", target_bitrate,  # 目标比特率
                "-ar", "16000",  # 采样率16kHz（paraformer-mtl-v1最低要求）
                "-ac", "1",  # 转为单声道
                str(compressed_file)
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore"
            )

            if result.returncode != 0:
                logger.error(f"Audio compression failed: {result.stderr}")
                return None

            if not compressed_file.exists():
                logger.error("Compressed audio file not created")
                return None

            original_size = audio_file.stat().st_size
            compressed_size = compressed_file.stat().st_size
            logger.info(f"Audio compressed: {original_size / 1024 / 1024:.2f}MB -> {compressed_size / 1024 / 1024:.2f}MB")

            return compressed_file

        except Exception as e:
            logger.exception(f"Error compressing audio: {e}")
            return None

    def get_audio_duration(self, audio_file: Path) -> Optional[float]:
        """
        获取音频文件的时长

        Args:
            audio_file: 音频文件路径

        Returns:
            音频时长（秒），失败返回None
        """
        try:
            probe_cmd = [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(audio_file)
            ]

            probe_result = subprocess.run(
                probe_cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore"
            )

            if probe_result.returncode != 0:
                logger.error(f"Failed to get audio duration: {probe_result.stderr}")
                return None

            try:
                duration = float(probe_result.stdout.strip())
                return duration
            except ValueError:
                logger.error("Invalid audio duration format")
                return None

        except Exception as e:
            logger.exception(f"Error getting audio duration: {e}")
            return None

    def extract_audio_from_video(self, video_file: str | Path) -> Optional[Path]:
        """
        Extract audio from video file

        Args:
            video_file: Video file path

        Returns:
            Audio file path if successful, None otherwise
        """
        try:
            video_path = Path(video_file)
            if not video_path.exists():
                logger.error(f"Video file not found: {video_path}")
                return None

            # Create audio directory in temp
            audio_dir = settings.temp_dir / "audio"
            audio_dir.mkdir(exist_ok=True)

            # Output audio file
            audio_file = audio_dir / f"{video_path.stem}.mp3"

            # FFmpeg command to extract audio with compression
            # 提取音频时使用压缩参数，避免生成过大的文件
            cmd = [
                "ffmpeg",
                "-y",  # Overwrite output file
                "-i", str(video_path),
                "-vn",  # 不处理视频
                "-acodec", "libmp3lame",  # 使用MP3编码
                "-b:a", "128k",  # 音频比特率128k（平衡质量和大小）
                "-ar", "16000",  # 采样率16kHz
                "-ac", "1",  # 单声道
                str(audio_file)
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore"
            )

            if result.returncode != 0:
                logger.error(f"FFmpeg failed: {result.stderr}")
                return None

            if not audio_file.exists():
                logger.error("Audio file not created")
                return None

            file_size = audio_file.stat().st_size
            logger.info(f"Extracted audio size: {file_size / 1024 / 1024:.2f}MB")

            return audio_file

        except Exception as e:
            logger.exception(f"Error extracting audio: {e}")
            return None

    def _transcribe_single_file(self, audio_path: Path) -> Optional[str]:
        """
        转录单个音频文件（内部方法）

        Args:
            audio_path: 音频文件路径

        Returns:
            转录文本，失败返回None
        """
        try:
            # 从激活码解密的环境变量或配置文件获取API密钥
            api_key = self._get_api_key()
            if not api_key:
                logger.error("DashScope API key not configured. Please activate the software first.")
                return None

            # 更新 dashscope API 密钥
            dashscope.api_key = api_key

            # DashScope only supports public URL, upload to MinIO first
            # Upload and get object name
            timestamp = int(audio_path.stat().st_mtime)
            object_name = f"{timestamp}_{audio_path.name}"
            audio_url = minio_uploader.upload_file(
                audio_path,
                object_name=object_name,
                folder="audios"
            )

            if not audio_url:
                logger.error("Failed to upload audio to MinIO")
                return None

            # Test URL accessibility
            try:
                import requests
                test_response = requests.head(audio_url, timeout=5)
                if test_response.status_code != 200:
                    logger.warning(f"URL returned status {test_response.status_code}, might not be accessible")
            except Exception as e:
                logger.error(f"URL accessibility test failed: {e}")
                logger.error("DashScope requires publicly accessible URLs. Please check:")
                logger.error("1. MinIO server is accessible from public internet")
                logger.error("2. Bucket policy allows public read access")
                logger.error("3. Firewall/network allows external access")
                return None

            # Call DashScope ASR API with URL
            task_response = dashscope.audio.asr.Transcription.async_call(
                model=settings.dashscope_model,
                file_urls=[audio_url]
            )

            if not task_response:
                logger.error("Failed to create transcription task: No response from API")
                return None

            if not task_response.output:
                logger.error(f"Failed to create transcription task: {getattr(task_response, 'message', 'Unknown error')}")
                logger.error(f"Response details: {task_response}")
                return None

            task_id = task_response.output.task_id

            # Wait for task completion
            transcribe_response = dashscope.audio.asr.Transcription.wait(task=task_id)

            if transcribe_response.status_code != 200:
                logger.error(f"Transcription failed: {transcribe_response.message}")
                return None

            # Check for empty audio
            try:
                if hasattr(transcribe_response.output, 'code') and transcribe_response.output.code == 'SUCCESS_WITH_NO_VALID_FRAGMENT':
                    logger.warning("Audio contains no valid speech fragment")
                    return None
            except (AttributeError, KeyError):
                pass

            # Get transcription result
            if not transcribe_response.output.results:
                logger.error("No transcription results returned")
                return None

            first_result = transcribe_response.output.results[0]

            # Convert to dict if it's not already
            if hasattr(first_result, '__dict__'):
                first_result_dict = first_result.__dict__ if not isinstance(first_result, dict) else first_result
            else:
                first_result_dict = first_result

            # Check for task failure (e.g., FILE_DOWNLOAD_FAILED)
            subtask_status = None
            error_code = None
            error_msg = None

            if isinstance(first_result_dict, dict):
                subtask_status = first_result_dict.get("subtask_status")
                error_code = first_result_dict.get("code", "UNKNOWN")
                error_msg = first_result_dict.get("message", "No error message")
            elif hasattr(first_result, 'subtask_status'):
                subtask_status = getattr(first_result, 'subtask_status', None)
                error_code = getattr(first_result, 'code', "UNKNOWN")
                error_msg = getattr(first_result, 'message', "No error message")

            if subtask_status == "FAILED":
                logger.error(f"Transcription task failed: {error_code} - {error_msg}")

                if error_code == "FILE_DOWNLOAD_FAILED":
                    logger.error("DashScope cannot access the audio file. Please check:")
                    logger.error("1. MinIO bucket policy allows public read access")
                    logger.error("2. MinIO server is accessible from public internet")
                    logger.error("3. File URL is correct and accessible")

                return None

            # Try to get transcription URL (old format)
            transcription_url = None
            if isinstance(first_result_dict, dict):
                transcription_url = first_result_dict.get("transcription_url")
            elif hasattr(first_result, 'transcription_url'):
                transcription_url = getattr(first_result, 'transcription_url', None)

            if transcription_url:
                # Fetch transcription text from URL (old format)
                response = requests.get(transcription_url)

                if response.status_code != 200:
                    logger.error(f"Failed to fetch transcription: {response.status_code}")
                    return None

                transcription_data = response.json()
                text = transcription_data.get("transcripts", [{}])[0].get("text", "")
            else:
                # Try direct text field (new format)
                text = None

                # Try multiple ways to extract text
                if isinstance(first_result_dict, dict):
                    text = first_result_dict.get("text") or first_result_dict.get("transcription_text", "")

                    # If still no text, try to extract from nested structure
                    if not text and "transcription" in first_result_dict:
                        transcription = first_result_dict["transcription"]
                        if isinstance(transcription, dict):
                            text = transcription.get("text", "")
                        elif isinstance(transcription, str):
                            text = transcription
                elif hasattr(first_result, 'text'):
                    text = getattr(first_result, 'text', None) or getattr(first_result, 'transcription_text', None)

                    # Try nested transcription attribute
                    if not text and hasattr(first_result, 'transcription'):
                        transcription = getattr(first_result, 'transcription', None)
                        if isinstance(transcription, dict):
                            text = transcription.get("text", "")
                        elif isinstance(transcription, str):
                            text = transcription
                        elif hasattr(transcription, 'text'):
                            text = getattr(transcription, 'text', None)

            if not text:
                logger.warning("Empty transcription result")
                return None

            return text

        except Exception as e:
            logger.exception(f"Error transcribing single audio file: {e}")
            return None

    def transcribe_audio(self, audio_file: str | Path) -> Optional[tuple[str, float]]:
        """
        转录音频文件为文本

        DashScope API限制：
        - 音频文件不超过2GB
        - 时长在12小时以内

        处理流程：
        1. 检查文件大小和时长
        2. 如果超过2GB或12小时，先压缩
        3. 直接转录（无需分片）

        Args:
            audio_file: 音频文件路径

        Returns:
            (转录文本, 音频时长秒数) 元组，失败返回None
        """
        try:
            audio_path = Path(audio_file)
            if not audio_path.exists():
                logger.error(f"Audio file not found: {audio_path}")
                return None

            file_size = audio_path.stat().st_size
            logger.info(f"Audio file size: {file_size / 1024 / 1024:.2f}MB")

            # 获取音频时长
            duration = self.get_audio_duration(audio_path)
            if duration:
                logger.info(f"Audio duration: {duration / 60:.2f} minutes")

            # 检查是否需要压缩
            need_compress = False
            if file_size > self.MAX_FILE_SIZE:
                logger.warning(f"File size ({file_size / 1024 / 1024 / 1024:.2f}GB) exceeds 2GB limit")
                need_compress = True

            if duration and duration > self.MAX_DURATION:
                logger.warning(f"Audio duration ({duration / 3600:.2f} hours) exceeds 12 hours limit")
                need_compress = True

            # 如果不需要压缩，直接转录
            if not need_compress:
                logger.info("File is within limits, transcribing directly")
                text = self._transcribe_single_file(audio_path)
                return (text, duration) if text else None

            # 需要压缩
            logger.info("Compressing audio to meet API requirements...")
            compressed_file = self.compress_audio(audio_path)

            if not compressed_file:
                logger.error("Failed to compress audio")
                return None

            compressed_size = compressed_file.stat().st_size
            compressed_duration = self.get_audio_duration(compressed_file)

            logger.info(f"Compressed size: {compressed_size / 1024 / 1024:.2f}MB")
            if compressed_duration:
                logger.info(f"Compressed duration: {compressed_duration / 60:.2f} minutes")

            # 检查压缩后是否仍然超限
            if compressed_size > self.MAX_FILE_SIZE:
                logger.error(f"Compressed file ({compressed_size / 1024 / 1024 / 1024:.2f}GB) still exceeds 2GB limit")
                try:
                    compressed_file.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete compressed file: {e}")
                return None

            if compressed_duration and compressed_duration > self.MAX_DURATION:
                logger.error(f"Compressed audio duration ({compressed_duration / 3600:.2f} hours) still exceeds 12 hours limit")
                try:
                    compressed_file.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete compressed file: {e}")
                return None

            # 转录压缩后的文件
            logger.info("Transcribing compressed audio...")
            text = self._transcribe_single_file(compressed_file)

            # 清理临时文件
            try:
                compressed_file.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete compressed file: {e}")

            # 使用压缩后的时长，如果没有则使用原始时长
            actual_duration = compressed_duration if compressed_duration else duration
            return (text, actual_duration) if text else None

        except Exception as e:
            logger.exception(f"Error transcribing audio: {e}")
            return None


# Global processor instance
audio_processor = AudioProcessor()
