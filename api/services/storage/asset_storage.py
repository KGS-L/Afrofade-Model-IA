from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, BinaryIO


class AssetStorageError(RuntimeError):
    """Raised when durable object storage cannot satisfy an operation."""


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
    def exists(self, asset: StoredAssetRef) -> bool:
        raise NotImplementedError

    @abstractmethod
    def metadata(self, asset: StoredAssetRef) -> dict[str, Any] | None:
        raise NotImplementedError
