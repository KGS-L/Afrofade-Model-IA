from __future__ import annotations

import re
from uuid import UUID

from services.storage.asset_storage import AssetStorageError, StoredAssetRef
from services.storage.supabase_storage import validate_asset_ref


_SAFE_SEGMENT = re.compile(r"^[A-Za-z0-9._-]+$")


def _safe_segment(value: str, label: str) -> str:
    segment = value.strip()
    if not segment or not _SAFE_SEGMENT.fullmatch(segment) or segment in {".", ".."}:
        raise AssetStorageError(f"Invalid {label} storage path segment")
    return segment


def _owner_prefix(*, user_id: UUID | None = None, salon_id: UUID | None = None) -> str:
    if salon_id is not None:
        return f"salons/{salon_id}"
    if user_id is not None:
        return f"users/{user_id}"
    raise AssetStorageError("A user_id or salon_id is required for owned assets")


def client_photo_ref(
    filename: str,
    *,
    user_id: UUID | None = None,
    salon_id: UUID | None = None,
) -> StoredAssetRef:
    safe_filename = _safe_segment(filename, "filename")
    owner = _owner_prefix(user_id=user_id, salon_id=salon_id)
    return validate_asset_ref(StoredAssetRef("client-photos", f"temporary/{owner}/{safe_filename}"))


def canonical_head_ref(
    head_id: UUID | str,
    filename: str,
    *,
    user_id: UUID | None = None,
    salon_id: UUID | None = None,
) -> StoredAssetRef:
    safe_head_id = _safe_segment(str(head_id), "head id")
    safe_filename = _safe_segment(filename, "filename")
    owner = _owner_prefix(user_id=user_id, salon_id=salon_id)
    return validate_asset_ref(
        StoredAssetRef("heads", f"canonical/{owner}/{safe_head_id}/{safe_filename}")
    )


def raw_hair_asset_ref(style_id: str, version: int, filename: str) -> StoredAssetRef:
    safe_style = _safe_segment(style_id, "style id")
    safe_filename = _safe_segment(filename, "filename")
    if version < 1:
        raise AssetStorageError("Hair asset version must be at least 1")
    return validate_asset_ref(
        StoredAssetRef("hair-assets", f"raw/{safe_style}/v{version}/{safe_filename}")
    )


def canonical_hair_asset_ref(style_id: str, version: int, filename: str) -> StoredAssetRef:
    safe_style = _safe_segment(style_id, "style id")
    safe_filename = _safe_segment(filename, "filename")
    if version < 1:
        raise AssetStorageError("Hair asset version must be at least 1")
    return validate_asset_ref(
        StoredAssetRef("hair-assets", f"canonical/{safe_style}/v{version}/{safe_filename}")
    )


def tryon_export_ref(
    export_id: UUID | str,
    filename: str,
    *,
    user_id: UUID | None = None,
    salon_id: UUID | None = None,
) -> StoredAssetRef:
    safe_export_id = _safe_segment(str(export_id), "export id")
    safe_filename = _safe_segment(filename, "filename")
    owner = _owner_prefix(user_id=user_id, salon_id=salon_id)
    return validate_asset_ref(
        StoredAssetRef("tryons", f"exports/{owner}/{safe_export_id}/{safe_filename}")
    )
