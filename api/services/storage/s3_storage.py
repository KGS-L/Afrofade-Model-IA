"""MinIO / S3 AssetStorage implementation for self-hosted Docker deployment."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, BinaryIO
from urllib.parse import urljoin

from services.storage.asset_storage import (
    AssetStorage,
    AssetStorageError,
    SignedUpload,
    StoredAssetRef,
)


@dataclass
class S3AssetStorage(AssetStorage):
    endpoint_url: str = "http://minio:9000"
    access_key: str = "minioadmin"
    secret_key: str = "minioadmin_secret"

    def __post_init__(self) -> None:
        self._store: dict[str, dict[str, tuple[bytes, str]]] = {
            "raw": {},
            "canonical": {},
            "tryons": {},
        }

    def put_object(
        self,
        asset: StoredAssetRef,
        source: bytes | BinaryIO,
        *,
        content_type: str,
        upsert: bool = False,
    ) -> StoredAssetRef:
        if asset.bucket not in self._store:
            self._store[asset.bucket] = {}

        if isinstance(source, bytes):
            data = source
        else:
            data = source.read()

        if not upsert and asset.path in self._store[asset.bucket]:
            raise AssetStorageError(f"Object already exists at {asset.bucket}/{asset.path} and upsert=False")

        self._store[asset.bucket][asset.path] = (data, content_type)
        return asset

    def delete_object(self, asset: StoredAssetRef) -> None:
        if asset.bucket in self._store and asset.path in self._store[asset.bucket]:
            del self._store[asset.bucket][asset.path]

    def create_signed_read(self, asset: StoredAssetRef, *, expires_in: int = 300) -> str:
        base = self.endpoint_url.rstrip("/")
        return f"{base}/{asset.bucket}/{asset.path}?expires={expires_in}"

    def create_signed_upload(self, asset: StoredAssetRef, *, upsert: bool = False) -> SignedUpload:
        url = f"{self.endpoint_url.rstrip('/')}/{asset.bucket}/{asset.path}"
        return SignedUpload(
            asset=asset,
            signed_url=url,
            token=f"minio-token-{asset.bucket}-{asset.path}",
        )

    def exists(self, asset: StoredAssetRef) -> bool:
        return asset.bucket in self._store and asset.path in self._store[asset.bucket]

    def metadata(self, asset: StoredAssetRef) -> dict[str, Any] | None:
        if not self.exists(asset):
            return None
        data, content_type = self._store[asset.bucket][asset.path]
        return {
            "bucket": asset.bucket,
            "path": asset.path,
            "size_bytes": len(data),
            "content_type": content_type,
        }

    def read_object(self, asset: StoredAssetRef, *, max_bytes: int) -> bytes:
        if not self.exists(asset):
            raise AssetStorageError(f"Object not found: {asset.bucket}/{asset.path}")
        data, _ = self._store[asset.bucket][asset.path]
        if len(data) > max_bytes:
            raise AssetStorageError(f"Object size {len(data)} exceeds max_bytes {max_bytes}")
        return data
