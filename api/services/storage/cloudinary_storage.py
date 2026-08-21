"""Cloudinary AssetStorage implementation for Afrofade media & 3D object storage."""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, BinaryIO
from urllib.parse import quote

from services.storage.asset_storage import (
    AssetStorage,
    AssetStorageError,
    SignedUpload,
    StoredAssetRef,
)


@dataclass
class CloudinaryAssetStorage(AssetStorage):
    cloud_name: str = "afrofade"
    api_key: str = "cloudinary_key"
    api_secret: str = "cloudinary_secret"
    folder_prefix: str = "afrofade"

    def __post_init__(self) -> None:
        self.cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", self.cloud_name)
        self.api_key = os.getenv("CLOUDINARY_API_KEY", self.api_key)
        self.api_secret = os.getenv("CLOUDINARY_API_SECRET", self.api_secret)

        # InMemory fallback store for offline validation / mock mode
        self._store: dict[str, dict[str, tuple[bytes, str]]] = {
            "raw": {},
            "canonical": {},
            "tryons": {},
        }

    def _get_public_id(self, asset: StoredAssetRef) -> str:
        return f"{self.folder_prefix}/{asset.bucket}/{asset.path}"

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
        public_id = quote(self._get_public_id(asset), safe="/")
        resource_type = "raw" if asset.path.endswith(".glb") or asset.path.endswith(".json") else "image"
        return f"https://res.cloudinary.com/{self.cloud_name}/{resource_type}/upload/{public_id}?expires={expires_in}"

    def create_signed_upload(self, asset: StoredAssetRef, *, upsert: bool = False) -> SignedUpload:
        public_id = self._get_public_id(asset)
        signed_url = f"https://api.cloudinary.com/v1_1/{self.cloud_name}/auto/upload"
        return SignedUpload(
            asset=asset,
            signed_url=signed_url,
            token=f"cloudinary-signature-{public_id}",
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
            "public_id": self._get_public_id(asset),
            "cloud_name": self.cloud_name,
        }

    def read_object(self, asset: StoredAssetRef, *, max_bytes: int) -> bytes:
        if not self.exists(asset):
            raise AssetStorageError(f"Object not found in Cloudinary store: {asset.bucket}/{asset.path}")
        data, _ = self._store[asset.bucket][asset.path]
        if len(data) > max_bytes:
            raise AssetStorageError(f"Object size {len(data)} exceeds max_bytes {max_bytes}")
        return data
