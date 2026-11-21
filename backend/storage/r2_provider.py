import os
import io
import uuid
import logging
from typing import Optional, Tuple
from storage.base import StorageProvider
from config import (
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_ENDPOINT_URL,
    R2_PUBLIC_DOMAIN,
)

logger = logging.getLogger(__name__)


class R2StorageProvider(StorageProvider):
    """
    Cloudflare R2 Storage Provider (S3-compatible API).
    Provides durable, globally distributed object storage with zero egress fees.
    """

    def __init__(self):
        self._s3_client = None

    def _get_client(self, config: dict = None):
        if self._s3_client is not None:
            return self._s3_client

        cfg = config or {}
        access_key = cfg.get("access_key_id") or R2_ACCESS_KEY_ID or os.getenv("AWS_ACCESS_KEY_ID")
        secret_key = cfg.get("secret_access_key") or R2_SECRET_ACCESS_KEY or os.getenv("AWS_SECRET_ACCESS_KEY")
        endpoint_url = cfg.get("endpoint_url") or R2_ENDPOINT_URL

        if not endpoint_url and R2_ACCOUNT_ID:
            endpoint_url = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

        if not access_key or not secret_key or not endpoint_url:
            # When R2 credentials are not set, return None (allows fallback / mock in dev/tests)
            return None

        import boto3
        from botocore.config import Config

        self._s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto",
            config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
        )
        return self._s3_client

    def _get_bucket_name(self, config: dict = None) -> str:
        cfg = config or {}
        return cfg.get("bucket_name") or R2_BUCKET_NAME or "famdoc-vault"

    def health_check(self, config: dict) -> bool:
        """Lightweight availability check: head_bucket or credential presence."""
        try:
            client = self._get_client(config)
            if client is None:
                return False
            bucket = self._get_bucket_name(config)
            client.head_bucket(Bucket=bucket)
            return True
        except Exception as e:
            logger.warning(f"R2 health check failed: {e}")
            return False

    def verify_credentials(self, config: dict) -> bool:
        client = self._get_client(config)
        if client is None:
            raise Exception("R2 credentials not configured")
        bucket = self._get_bucket_name(config)
        client.head_bucket(Bucket=bucket)
        return True

    def ensure_vault_folder(self, family_id: str, config: dict, db=None) -> str:
        """In R2 object storage, returns the prefix for this family's vault."""
        return f"{family_id}"

    def create_folder(self, config: dict, parent_folder_id: str, folder_name: str, db=None) -> str:
        """Virtual folders are tracked in PostgreSQL; returns a unique identifier."""
        return f"r2_folder_{uuid.uuid4().hex[:12]}"

    def move_file(self, config: dict, cloud_file_id: str, new_parent_id: str, db=None) -> bool:
        """R2 keys are immutable flat object IDs; hierarchy is tracked in the DB."""
        return True

    def upload_file(
        self,
        config: dict,
        vault_folder_id: str,
        filename: str,
        file_content: bytes,
        mimetype: str,
        username: str = None,
        db=None,
    ) -> dict:
        client = self._get_client(config)
        bucket = self._get_bucket_name(config)
        unique_key = f"{vault_folder_id}/{uuid.uuid4()}_{filename}"

        if client is None:
            raise Exception("Cloudflare R2 client is not configured (missing R2 credentials)")

        extra_args = {"ContentType": mimetype or "application/octet-stream"}
        client.put_object(
            Bucket=bucket,
            Key=unique_key,
            Body=file_content,
            **extra_args
        )

        cloud_link = None
        if R2_PUBLIC_DOMAIN:
            cloud_link = f"https://{R2_PUBLIC_DOMAIN}/{unique_key}"

        return {
            "cloud_file_id": unique_key,
            "cloud_link": cloud_link
        }

    def download_file(self, config: dict, cloud_file_id: str, db=None) -> bytes:
        client = self._get_client(config)
        bucket = self._get_bucket_name(config)

        if client is None:
            raise Exception("Cloudflare R2 client is not configured")

        response = client.get_object(Bucket=bucket, Key=cloud_file_id)
        return response["Body"].read()

    def delete_file(self, config: dict, cloud_file_id: str, db=None) -> bool:
        client = self._get_client(config)
        bucket = self._get_bucket_name(config)

        if client is None:
            return True

        try:
            client.delete_object(Bucket=bucket, Key=cloud_file_id)
            return True
        except Exception as e:
            logger.warning(f"Failed to delete object from R2 ({cloud_file_id}): {e}")
            return False

    def rename_file(self, config: dict, cloud_file_id: str, new_name: str, db=None) -> bool:
        """Object storage keys can remain stable while DB tracks the display name."""
        return True

    def get_direct_download_url(self, config: dict, cloud_file_id: str, db=None) -> Optional[str]:
        """Generates a temporary presigned GET URL valid for 1 hour."""
        client = self._get_client(config)
        bucket = self._get_bucket_name(config)

        if client is None:
            return None

        try:
            url = client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": bucket, "Key": cloud_file_id},
                ExpiresIn=3600
            )
            return url
        except Exception as e:
            logger.warning(f"Failed to generate R2 presigned download URL: {e}")
            return None

    def generate_presigned_upload_url(
        self,
        family_id: str,
        filename: str,
        mimetype: str,
        expires_in: int = 3600
    ) -> dict:
        """
        Generates a temporary presigned PUT URL allowing clients to upload directly to R2.
        Bypasses server proxy and edge 100MB body limits.
        """
        client = self._get_client()
        bucket = self._get_bucket_name()

        if client is None:
            raise Exception("Cloudflare R2 client is not configured")

        object_key = f"{family_id}/{uuid.uuid4()}_{filename}"
        params = {
            "Bucket": bucket,
            "Key": object_key,
            "ContentType": mimetype or "application/octet-stream"
        }

        upload_url = client.generate_presigned_url(
            ClientMethod="put_object",
            Params=params,
            ExpiresIn=expires_in
        )

        return {
            "upload_url": upload_url,
            "object_key": object_key,
            "bucket": bucket,
            "expires_in": expires_in
        }

    def stream_file(self, config: dict, cloud_file_id: str, db=None, range_header: str = None):
        """
        Streams object content from R2 in 128 KB chunks, supporting HTTP 206 Range headers.
        """
        client = self._get_client(config)
        bucket = self._get_bucket_name(config)

        if client is None:
            raise Exception("Cloudflare R2 client is not configured")

        get_params = {"Bucket": bucket, "Key": cloud_file_id}
        if range_header:
            get_params["Range"] = range_header

        response = client.get_object(**get_params)
        body = response["Body"]
        content_range = response.get("ContentRange")
        content_length = response.get("ContentLength")

        start, end, total = None, None, None
        if content_range and "bytes " in content_range:
            try:
                cr_parts = content_range.replace("bytes ", "").split("/")
                total = int(cr_parts[1]) if len(cr_parts) > 1 and cr_parts[1] != "*" else None
                range_bounds = cr_parts[0].split("-")
                start = int(range_bounds[0])
                end = int(range_bounds[1])
            except Exception:
                pass
        elif content_length:
            total = content_length

        def chunk_generator():
            try:
                while True:
                    chunk = body.read(128 * 1024)
                    if not chunk:
                        break
                    yield chunk
            finally:
                body.close()

        return chunk_generator(), start, end, total
