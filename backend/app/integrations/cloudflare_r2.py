"""Cloudflare R2 (S3-compatible) wrapper -- 영상 저장 zero-egress.

용도 (기획서 §부록 J + §7.6):
- 영상 파일 저장 (50-300MB)
- Pre-signed URL 발급 (15min TTL upload, 1h TTL download)
- 무료 egress (Supabase Storage 대비 영상 대용량 트래픽에 대규모 절감)
"""

from typing import Any

import boto3
from botocore.client import Config

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

_client: Any = None


def _get_client() -> Any:
    global _client
    if _client is None:
        if not (settings.r2_account_id and settings.r2_access_key_id and settings.r2_secret_access_key):
            raise ExternalAPIError("R2", "R2 credentials not configured")
        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
    return _client


def upload_file(key: str, file_path: str, content_type: str = "application/octet-stream") -> str:
    """Upload local file to R2. Returns public URL (if R2_PUBLIC_URL configured)."""
    try:
        client = _get_client()
        with open(file_path, "rb") as f:
            client.upload_fileobj(
                f, settings.r2_bucket, key,
                ExtraArgs={"ContentType": content_type},
            )
        return public_url(key)
    except Exception as e:
        raise ExternalAPIError("R2", f"Upload failed: {e}")


def upload_bytes(key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """Upload bytes directly to R2."""
    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.r2_bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return public_url(key)
    except Exception as e:
        raise ExternalAPIError("R2", f"Upload bytes failed: {e}")


def public_url(key: str) -> str:
    """Return public URL for an object."""
    base = settings.r2_public_url.rstrip("/")
    if base:
        return f"{base}/{key}"
    return f"https://{settings.r2_account_id}.r2.cloudflarestorage.com/{settings.r2_bucket}/{key}"


def presigned_upload_url(key: str, expires_in: int = 900, content_type: str = "application/octet-stream") -> str:
    """Pre-signed PUT URL for direct browser upload. Default TTL 15min."""
    try:
        client = _get_client()
        return client.generate_presigned_url(
            "put_object",
            Params={"Bucket": settings.r2_bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires_in,
            HttpMethod="PUT",
        )
    except Exception as e:
        raise ExternalAPIError("R2", f"Presigned upload URL failed: {e}")


def presigned_download_url(key: str, expires_in: int = 3600) -> str:
    """Pre-signed GET URL for download. Default TTL 1h."""
    try:
        client = _get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.r2_bucket, "Key": key},
            ExpiresIn=expires_in,
        )
    except Exception as e:
        raise ExternalAPIError("R2", f"Presigned download URL failed: {e}")


def delete_object(key: str) -> None:
    try:
        client = _get_client()
        client.delete_object(Bucket=settings.r2_bucket, Key=key)
    except Exception as e:
        raise ExternalAPIError("R2", f"Delete failed: {e}")
