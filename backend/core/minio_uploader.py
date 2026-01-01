"""MinIO Uploader"""
import os
import tempfile
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from io import BytesIO

from minio import Minio
from minio.error import S3Error
from minio.commonconfig import ENABLED
from minio.versioningconfig import VersioningConfig
from loguru import logger

from config import settings


@contextmanager
def temp_file_context(file_content: bytes):
    """
    Context manager for creating temporary files

    Args:
        file_content: File content in bytes

    Yields:
        str: Temporary file path
    """
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    try:
        temp_file.write(file_content)
        temp_file.flush()
        temp_file.close()
        yield temp_file.name
    finally:
        try:
            os.unlink(temp_file.name)
        except Exception as e:
            logger.warning(f"Failed to delete temp file: {e}")


class MinIOUploader:
    """MinIO File Uploader"""

    def __init__(self):
        """Initialize MinIO client"""
        if not settings.minio_endpoint or not settings.minio_access_key or not settings.minio_secret_key:
            logger.warning("MinIO credentials not configured, uploader will not work")
            self.client = None
            return

        try:
            self.client = Minio(
                endpoint=settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure
            )

            # Ensure bucket exists
            self._ensure_bucket_exists()
            logger.info(f"MinIO client initialized: {settings.minio_endpoint}/{settings.minio_bucket}")

        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {e}")
            self.client = None

    def _ensure_bucket_exists(self):
        """Ensure the bucket exists, create if not"""
        if not self.client:
            return

        try:
            if not self.client.bucket_exists(settings.minio_bucket):
                self.client.make_bucket(settings.minio_bucket)
                logger.info(f"Created bucket: {settings.minio_bucket}")

            # Set bucket policy to allow public read access for audio files
            self._set_public_read_policy()

        except S3Error as e:
            logger.error(f"Error checking/creating bucket: {e}")

    def _set_public_read_policy(self):
        """Set bucket policy to allow public read access"""
        if not self.client:
            return

        try:
            # Policy to allow public read access to the bucket
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{settings.minio_bucket}/*"]
                    }
                ]
            }

            import json
            self.client.set_bucket_policy(settings.minio_bucket, json.dumps(policy))
            logger.debug(f"Set public read policy for bucket: {settings.minio_bucket}")

        except S3Error as e:
            logger.warning(f"Failed to set bucket policy (may already exist): {e}")

    def upload_file(
        self,
        file_path: str | Path,
        object_name: Optional[str] = None,
        folder: str = "uploads",
        content_type: str = "application/octet-stream"
    ) -> Optional[str]:
        """
        Upload file to MinIO from file path

        Args:
            file_path: Local file path
            object_name: Object name in MinIO (auto-generate if None)
            folder: Folder prefix in bucket
            content_type: MIME type of the file

        Returns:
            Object URL if successful, None otherwise
        """
        if not self.client:
            logger.error("MinIO client not initialized")
            return None

        file_path = Path(file_path)
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return None

        # Generate object name if not provided
        if not object_name:
            timestamp = int(datetime.now().timestamp())
            # Remove spaces from filename
            clean_filename = file_path.name.replace(' ', '_')
            object_name = f"{folder}/{timestamp}_{clean_filename}"
        else:
            # Remove spaces from object name
            clean_object_name = object_name.replace(' ', '_')
            object_name = f"{folder}/{clean_object_name}"

        try:
            # Ensure bucket exists
            if not self.client.bucket_exists(settings.minio_bucket):
                self.client.make_bucket(settings.minio_bucket)
                self._set_public_read_policy()

            # Upload file
            self.client.fput_object(
                bucket_name=settings.minio_bucket,
                object_name=object_name,
                file_path=str(file_path),
                content_type=content_type
            )

            # Generate URL
            url = self._get_object_url(object_name)
            logger.info(f"File uploaded successfully: {url}")
            return url

        except S3Error as e:
            logger.error(f"Failed to upload file: {e}")
            return None

    def upload_bytes(
        self,
        file_content: bytes,
        file_name: str,
        path: Optional[str] = None,
        content_type: str = "application/octet-stream"
    ) -> Optional[str]:
        """
        Upload file content (bytes) to MinIO

        Args:
            file_content: File content in bytes
            file_name: File name
            path: Storage path, e.g. 'documents/images/'
            content_type: MIME type of the file

        Returns:
            Object URL if successful, None otherwise
        """
        if not self.client:
            logger.error("MinIO client not initialized")
            return None

        # Build object name with optional path
        # Remove spaces from filename
        clean_filename = file_name.replace(' ', '_')
        object_name = clean_filename
        if path:
            # Ensure path ends with slash
            normalized_path = path if path.endswith("/") else f"{path}/"
            object_name = f"{normalized_path}{clean_filename}"

        try:
            # Ensure bucket exists
            if not self.client.bucket_exists(settings.minio_bucket):
                self.client.make_bucket(settings.minio_bucket)
                self._set_public_read_policy()

            # Upload using BytesIO
            file_stream = BytesIO(file_content)
            file_size = len(file_content)

            self.client.put_object(
                bucket_name=settings.minio_bucket,
                object_name=object_name,
                data=file_stream,
                length=file_size,
                content_type=content_type
            )

            # Generate URL
            url = self._get_object_url(object_name)
            logger.info(f"File uploaded successfully: {url}")
            return url

        except S3Error as e:
            logger.error(f"Failed to upload file: {e}")
            return None

    def _get_object_url(self, object_name: str) -> str:
        """
        Get public object URL

        Uses CDN endpoint if configured, otherwise uses MinIO endpoint
        """
        # Use CDN endpoint if configured, otherwise use MinIO endpoint
        endpoint = settings.minio_cdn_endpoint or settings.minio_endpoint

        # CDN endpoints typically use HTTPS, MinIO respects the secure setting
        if settings.minio_cdn_endpoint:
            protocol = "https"
        else:
            protocol = "https" if settings.minio_secure else "http"

        return f"{protocol}://{endpoint}/{settings.minio_bucket}/{object_name}"

    def get_presigned_url(self, object_name: str, expires: timedelta = timedelta(hours=1)) -> Optional[str]:
        """
        Get presigned URL for temporary access

        Args:
            object_name: Object name in MinIO
            expires: URL expiration time

        Returns:
            Presigned URL if successful, None otherwise
        """
        if not self.client:
            logger.error("MinIO client not initialized")
            return None

        try:
            url = self.client.presigned_get_object(
                bucket_name=settings.minio_bucket,
                object_name=object_name,
                expires=expires
            )
            return url
        except S3Error as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None


# Global uploader instance
minio_uploader = MinIOUploader()
