"""
Afrofade — AssetStorage Abstract Interface & Helpers (BMAD Story 7.4)
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, BinaryIO, Optional
import os


class AssetStorageError(RuntimeError):
    """Raised when an object storage operation fails."""


@dataclass(frozen=True)
class StoredAssetRef:
    bucket: str
    path: str


@dataclass(frozen=True)
class SignedUpload:
    asset: StoredAssetRef
    signed_url: str
    token: str


class AssetStorage(ABC):
    """Abstract interface for server-authoritative object storage."""

    @abstractmethod
    def put_object(
        self,
        asset: StoredAssetRef,
        source: bytes | BinaryIO,
        *,
        content_type: str,
        upsert: bool = False,
    ) -> StoredAssetRef:
        raise NotImplementedError

    @abstractmethod
    def delete_object(self, asset: StoredAssetRef) -> None:
        raise NotImplementedError

    @abstractmethod
    def create_signed_read(self, asset: StoredAssetRef, *, expires_in: int = 300) -> str:
        raise NotImplementedError

    @abstractmethod
    def create_signed_upload(self, asset: StoredAssetRef, *, upsert: bool = False) -> SignedUpload:
        raise NotImplementedError

    @abstractmethod
    def metadata(self, asset: StoredAssetRef) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def exists(self, asset: StoredAssetRef) -> bool:
        raise NotImplementedError

    @abstractmethod
    def read_object(self, asset: StoredAssetRef, *, max_bytes: int) -> bytes:
        raise NotImplementedError


class AssetStorageService:
    DEFAULT_BUCKET = "3d-assets"

    @classmethod
    def get_path(cls, folder: str, filename: str) -> str:
        valid_folders = {"heads", "hair", "temp_photos", "exports"}
        if folder not in valid_folders:
            raise ValueError(f"Invalid storage folder: {folder}. Must be one of {valid_folders}")
        return f"{folder}/{filename}"

    @classmethod
    def build_local_or_public_url(cls, folder: str, filename: str) -> str:
        path = cls.get_path(folder, filename)
        supabase_url = os.getenv("SUPABASE_URL", "http://localhost:54321")
        return f"{supabase_url}/storage/v1/object/public/{cls.DEFAULT_BUCKET}/{path}"
