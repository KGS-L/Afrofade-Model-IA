from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import os
from typing import Any, Protocol
from uuid import UUID

import requests

from services.storage.asset_storage import StoredAssetRef


class HairAssetRepositoryError(RuntimeError):
    """Raised when durable hair asset metadata cannot be read or persisted."""


@dataclass(frozen=True)
class HairAssetVersionRecord:
    id: UUID
    style_id: str
    version: int
    provider: str
    source_job_id: UUID | None
    raw_ref: StoredAssetRef
    canonical_ref: StoredAssetRef | None
    preview_ref: StoredAssetRef | None
    anchor_map_ref: StoredAssetRef | None
    coordinate_system: str
    unit: str
    scalp_anchor_version: str | None
    polygon_count: int | None
    lods: list[dict[str, Any]]
    generation_cost_fcfa: int | None
    provider_metadata: dict[str, Any]
    validation_report: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime


class HairAssetVersionRepository(Protocol):
    def get_version(self, style_id: str, version: int) -> HairAssetVersionRecord | None:
        ...

    def persist_normalization(
        self,
        *,
        style_id: str,
        version: int,
        provider: str,
        raw_ref: StoredAssetRef,
        canonical_ref: StoredAssetRef,
        preview_ref: StoredAssetRef,
        anchor_map_ref: StoredAssetRef,
        scalp_anchor_version: str,
        polygon_count: int,
        lods: list[dict[str, Any]],
        provider_metadata: dict[str, Any],
        validation_report: dict[str, Any],
    ) -> HairAssetVersionRecord:
        ...

    def record_validation_failure(
        self,
        *,
        style_id: str,
        version: int,
        validation_report: dict[str, Any],
    ) -> HairAssetVersionRecord:
        ...

    def create_draft(self, *, style_id: str, version: int, provider: str,
                     source_job_id: UUID, raw_ref: StoredAssetRef,
                     generation_cost_fcfa: int, provider_metadata: dict[str, Any]) -> HairAssetVersionRecord: ...


def _parse_uuid(value: Any, field: str, *, optional: bool = False) -> UUID | None:
    if optional and value is None:
        return None
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise HairAssetRepositoryError(f"Invalid {field} in hair_asset_versions response") from exc


def _parse_datetime(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise HairAssetRepositoryError(f"Invalid {field} in hair_asset_versions response")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HairAssetRepositoryError(f"Invalid {field} in hair_asset_versions response") from exc


def _parse_optional_ref(payload: dict[str, Any], prefix: str) -> StoredAssetRef | None:
    bucket = payload.get(f"{prefix}_bucket")
    path = payload.get(f"{prefix}_path")
    if bucket is None and path is None:
        return None
    if not isinstance(bucket, str) or not bucket or not isinstance(path, str) or not path:
        raise HairAssetRepositoryError(f"Invalid {prefix} storage reference in hair_asset_versions")
    return StoredAssetRef(bucket=bucket, path=path)


def _parse_record(payload: Any) -> HairAssetVersionRecord:
    if not isinstance(payload, dict):
        raise HairAssetRepositoryError("Invalid hair_asset_versions response payload")

    raw_bucket = payload.get("raw_bucket")
    raw_path = payload.get("raw_path")
    if not isinstance(raw_bucket, str) or not raw_bucket or not isinstance(raw_path, str) or not raw_path:
        raise HairAssetRepositoryError("Invalid raw storage reference in hair_asset_versions")

    lods = payload.get("lods")
    if not isinstance(lods, list) or any(not isinstance(item, dict) for item in lods):
        raise HairAssetRepositoryError("Invalid lods in hair_asset_versions response")
    provider_metadata = payload.get("provider_metadata")
    validation_report = payload.get("validation_report")
    if not isinstance(provider_metadata, dict):
        provider_metadata = {}
    if not isinstance(validation_report, dict):
        validation_report = {}

    return HairAssetVersionRecord(
        id=_parse_uuid(payload.get("id"), "id"),  # type: ignore[arg-type]
        style_id=str(payload.get("style_id") or ""),
        version=int(payload.get("version") or 0),
        provider=str(payload.get("provider") or ""),
        source_job_id=_parse_uuid(payload.get("source_job_id"), "source_job_id", optional=True),
        raw_ref=StoredAssetRef(bucket=raw_bucket, path=raw_path),
        canonical_ref=_parse_optional_ref(payload, "canonical"),
        preview_ref=_parse_optional_ref(payload, "preview"),
        anchor_map_ref=_parse_optional_ref(payload, "anchor_map"),
        coordinate_system=str(payload.get("coordinate_system") or ""),
        unit=str(payload.get("unit") or ""),
        scalp_anchor_version=(
            str(payload.get("scalp_anchor_version"))
            if payload.get("scalp_anchor_version") is not None
            else None
        ),
        polygon_count=(int(payload["polygon_count"]) if payload.get("polygon_count") is not None else None),
        lods=[dict(item) for item in lods],
        generation_cost_fcfa=(
            int(payload["generation_cost_fcfa"])
            if payload.get("generation_cost_fcfa") is not None
            else None
        ),
        provider_metadata=provider_metadata,
        validation_report=validation_report,
        status=str(payload.get("status") or ""),
        created_at=_parse_datetime(payload.get("created_at"), "created_at"),
        updated_at=_parse_datetime(payload.get("updated_at"), "updated_at"),
    )


class SupabaseHairAssetVersionRepository:
    """Service-role repository for immutable/versioned hair asset metadata."""

    def __init__(
        self,
        supabase_url: str,
        service_role_key: str,
        *,
        session: requests.Session | Any | None = None,
    ) -> None:
        base_url = supabase_url.strip().rstrip("/")
        key = service_role_key.strip()
        if not base_url.startswith(("https://", "http://")):
            raise HairAssetRepositoryError("SUPABASE_URL must be an HTTP(S) URL")
        if os.getenv("FASTAPI_ENV", "").strip().lower() == "production" and not base_url.startswith("https://"):
            raise HairAssetRepositoryError("SUPABASE_URL must use HTTPS in production")
        if not key:
            raise HairAssetRepositoryError("SUPABASE_SERVICE_ROLE_KEY is required")

        self._rest_url = f"{base_url}/rest/v1"
        self._key = key
        self._session = session or requests.Session()

    @classmethod
    def from_env(cls) -> "SupabaseHairAssetVersionRepository":
        supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
        service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
        if not supabase_url or not service_role_key:
            raise HairAssetRepositoryError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for hair asset persistence"
            )
        return cls(supabase_url, service_role_key)

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, url: str, **kwargs: Any) -> Any:
        try:
            response = self._session.request(method, url, timeout=10, **kwargs)
        except Exception as exc:
            raise HairAssetRepositoryError(f"Hair asset persistence request failed: {exc}") from exc

        if not 200 <= int(response.status_code) < 300:
            detail = getattr(response, "text", "")
            raise HairAssetRepositoryError(
                f"Hair asset persistence returned HTTP {response.status_code}: {str(detail)[:300]}"
            )
        try:
            return response.json()
        except Exception as exc:
            raise HairAssetRepositoryError("Hair asset persistence returned invalid JSON") from exc

    def get_version(self, style_id: str, version: int) -> HairAssetVersionRecord | None:
        payload = self._request(
            "GET",
            f"{self._rest_url}/hair_asset_versions",
            headers=self._headers(),
            params={
                "style_id": f"eq.{style_id}",
                "version": f"eq.{version}",
                "select": "*",
                "limit": "1",
            },
        )
        if not isinstance(payload, list):
            raise HairAssetRepositoryError("Invalid hair_asset_versions list response")
        if not payload:
            return None
        return _parse_record(payload[0])

    def create_draft(self, *, style_id: str, version: int, provider: str,
                     source_job_id: UUID, raw_ref: StoredAssetRef,
                     generation_cost_fcfa: int, provider_metadata: dict[str, Any]) -> HairAssetVersionRecord:
        if provider != "trellis2": raise HairAssetRepositoryError("draft provider must be trellis2")
        payload = self._request("POST", f"{self._rest_url}/rpc/create_trellis2_hair_asset_draft",
            headers=self._headers(), json={"p_style_id":style_id,"p_version":version,
                "p_source_job_id":str(source_job_id),"p_raw_bucket":raw_ref.bucket,
                "p_raw_path":raw_ref.path,"p_generation_cost_fcfa":generation_cost_fcfa,
                "p_provider_metadata":provider_metadata})
        if not isinstance(payload, list) or len(payload) != 1: raise HairAssetRepositoryError("draft RPC returned invalid payload")
        record = _parse_record(payload[0])
        if record is None: raise HairAssetRepositoryError("draft idempotent resolution failed")
        if record.source_job_id != source_job_id or record.raw_ref != raw_ref:
            raise HairAssetRepositoryError("hair_asset_draft_identity_conflict")
        return record

    def persist_normalization(
        self,
        *,
        style_id: str,
        version: int,
        provider: str,
        raw_ref: StoredAssetRef,
        canonical_ref: StoredAssetRef,
        preview_ref: StoredAssetRef,
        anchor_map_ref: StoredAssetRef,
        scalp_anchor_version: str,
        polygon_count: int,
        lods: list[dict[str, Any]],
        provider_metadata: dict[str, Any],
        validation_report: dict[str, Any],
    ) -> HairAssetVersionRecord:
        payload = self._request(
            "POST",
            f"{self._rest_url}/rpc/persist_hair_asset_normalization",
            headers=self._headers(),
            json={
                "p_style_id": style_id,
                "p_version": version,
                "p_provider": provider,
                "p_raw_bucket": raw_ref.bucket,
                "p_raw_path": raw_ref.path,
                "p_canonical_bucket": canonical_ref.bucket,
                "p_canonical_path": canonical_ref.path,
                "p_preview_bucket": preview_ref.bucket,
                "p_preview_path": preview_ref.path,
                "p_anchor_map_bucket": anchor_map_ref.bucket,
                "p_anchor_map_path": anchor_map_ref.path,
                "p_scalp_anchor_version": scalp_anchor_version,
                "p_polygon_count": polygon_count,
                "p_lods": lods,
                "p_provider_metadata": provider_metadata,
                "p_validation_report": validation_report,
            },
        )
        if not isinstance(payload, list) or len(payload) != 1:
            raise HairAssetRepositoryError("persist_hair_asset_normalization must return exactly one record")
        return _parse_record(payload[0])

    def record_validation_failure(
        self,
        *,
        style_id: str,
        version: int,
        validation_report: dict[str, Any],
    ) -> HairAssetVersionRecord:
        payload = self._request(
            "POST",
            f"{self._rest_url}/rpc/record_hair_asset_normalization_failure",
            headers=self._headers(),
            json={
                "p_style_id": style_id,
                "p_version": version,
                "p_validation_report": validation_report,
            },
        )
        if not isinstance(payload, list) or len(payload) != 1:
            raise HairAssetRepositoryError(
                "record_hair_asset_normalization_failure must return exactly one record"
            )
        return _parse_record(payload[0])
