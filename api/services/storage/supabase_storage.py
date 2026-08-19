from __future__ import annotations

import os
from pathlib import PurePosixPath
from typing import Any, BinaryIO

from services.storage.asset_storage import (
    AssetStorage,
    AssetStorageError,
    SignedUpload,
    StoredAssetRef,
)


_ALLOWED_BUCKETS = {"client-photos", "heads", "hair-assets", "tryons"}


def validate_asset_ref(asset: StoredAssetRef) -> StoredAssetRef:
    bucket = asset.bucket.strip()
    path = asset.path.strip()

    if bucket not in _ALLOWED_BUCKETS:
        raise AssetStorageError(f"Unsupported storage bucket: {bucket or '<empty>'}")
    if not path or path.startswith("/") or "\\" in path or "://" in path or "\x00" in path:
        raise AssetStorageError("Storage path must be a relative POSIX object path")

    parts = PurePosixPath(path).parts
    if not parts or any(part in {"", ".", ".."} for part in parts):
        raise AssetStorageError("Storage path contains an invalid segment")
    if len(path) > 1024:
        raise AssetStorageError("Storage path is too long")

    return StoredAssetRef(bucket=bucket, path="/".join(parts))


def _extract_field(payload: Any, *names: str) -> Any:
    if isinstance(payload, dict):
        for name in names:
            if name in payload:
                return payload[name]
        data = payload.get("data")
        if isinstance(data, dict):
            for name in names:
                if name in data:
                    return data[name]

    for name in names:
        if hasattr(payload, name):
            return getattr(payload, name)

    return None


def _as_metadata(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        return dict(payload)
    if hasattr(payload, "model_dump"):
        dumped = payload.model_dump()
        if isinstance(dumped, dict):
            return dumped
    if hasattr(payload, "dict"):
        dumped = payload.dict()
        if isinstance(dumped, dict):
            return dumped
    if hasattr(payload, "__dict__"):
        return {key: value for key, value in vars(payload).items() if not key.startswith("_")}
    return {"value": str(payload)}


class SupabaseAssetStorage(AssetStorage):
    """Server-only durable object storage backed by the official Supabase Python SDK."""

    def __init__(self, supabase_url: str, service_role_key: str, *, client: Any | None = None) -> None:
        base_url = supabase_url.strip().rstrip("/")
        key = service_role_key.strip()

        if not base_url.startswith(("https://", "http://")):
            raise AssetStorageError("SUPABASE_URL must be an HTTP(S) URL")
        if os.getenv("FASTAPI_ENV", "").strip().lower() == "production" and not base_url.startswith("https://"):
            raise AssetStorageError("SUPABASE_URL must use HTTPS in production")
        if not key:
            raise AssetStorageError("SUPABASE_SERVICE_ROLE_KEY is required")

        if client is None:
            try:
                from supabase import create_client
            except ImportError as exc:
                raise AssetStorageError("The official 'supabase' Python package is required") from exc
            try:
                client = create_client(base_url, key)
            except Exception as exc:
                raise AssetStorageError(f"Unable to initialize Supabase storage client: {exc}") from exc

        self._client = client

    @classmethod
    def from_env(cls) -> "SupabaseAssetStorage":
        supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
        service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
        if not supabase_url or not service_role_key:
            raise AssetStorageError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for durable asset storage"
            )
        return cls(supabase_url, service_role_key)

    def _bucket(self, asset: StoredAssetRef) -> tuple[StoredAssetRef, Any]:
        validated = validate_asset_ref(asset)
        try:
            return validated, self._client.storage.from_(validated.bucket)
        except Exception as exc:
            raise AssetStorageError(f"Unable to access storage bucket {validated.bucket}: {exc}") from exc

    def put_object(
        self,
        asset: StoredAssetRef,
        source: bytes | BinaryIO,
        *,
        content_type: str,
        upsert: bool = False,
    ) -> StoredAssetRef:
        validated, bucket = self._bucket(asset)
        if not content_type.strip():
            raise AssetStorageError("content_type is required")
        try:
            bucket.upload(
                path=validated.path,
                file=source,
                file_options={
                    "content-type": content_type.strip(),
                    "upsert": "true" if upsert else "false",
                },
            )
        except Exception as exc:
            raise AssetStorageError(f"Unable to upload {validated.bucket}/{validated.path}: {exc}") from exc
        return validated

    def delete_object(self, asset: StoredAssetRef) -> None:
        validated, bucket = self._bucket(asset)
        try:
            bucket.remove([validated.path])
        except Exception as exc:
            raise AssetStorageError(f"Unable to delete {validated.bucket}/{validated.path}: {exc}") from exc

    def create_signed_read(self, asset: StoredAssetRef, *, expires_in: int = 300) -> str:
        validated, bucket = self._bucket(asset)
        if not 1 <= expires_in <= 86400:
            raise AssetStorageError("expires_in must be between 1 and 86400 seconds")
        try:
            response = bucket.create_signed_url(validated.path, expires_in)
        except Exception as exc:
            raise AssetStorageError(f"Unable to sign read URL for {validated.bucket}/{validated.path}: {exc}") from exc

        signed_url = _extract_field(response, "signedURL", "signedUrl", "signed_url")
        if not isinstance(signed_url, str) or not signed_url.startswith(("https://", "http://")):
            raise AssetStorageError("Supabase returned an invalid signed read URL")
        return signed_url

    def create_signed_upload(self, asset: StoredAssetRef, *, upsert: bool = False) -> SignedUpload:
        validated, bucket = self._bucket(asset)
        try:
            response = bucket.create_signed_upload_url(
                validated.path,
                options={"upsert": "true" if upsert else "false"},
            )
        except Exception as exc:
            raise AssetStorageError(f"Unable to sign upload URL for {validated.bucket}/{validated.path}: {exc}") from exc

        signed_url = _extract_field(response, "signedURL", "signedUrl", "signed_url")
        token = _extract_field(response, "token")
        if not isinstance(signed_url, str) or not signed_url.startswith(("https://", "http://")):
            raise AssetStorageError("Supabase returned an invalid signed upload URL")
        if not isinstance(token, str) or not token:
            raise AssetStorageError("Supabase returned an invalid signed upload token")

        return SignedUpload(asset=validated, signed_url=signed_url, token=token)

    def metadata(self, asset: StoredAssetRef) -> dict[str, Any] | None:
        validated, bucket = self._bucket(asset)
        parent, _, filename = validated.path.rpartition("/")
        try:
            response = bucket.list(
                parent,
                {
                    "limit": 100,
                    "offset": 0,
                    "search": filename,
                },
            )
        except Exception as exc:
            raise AssetStorageError(f"Unable to inspect {validated.bucket}/{validated.path}: {exc}") from exc

        if not isinstance(response, list):
            raise AssetStorageError("Supabase returned an invalid storage listing")

        for item in response:
            metadata = _as_metadata(item)
            if metadata.get("name") == filename:
                return metadata
        return None

    def exists(self, asset: StoredAssetRef) -> bool:
        return self.metadata(asset) is not None
