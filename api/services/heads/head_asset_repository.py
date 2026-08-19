from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import os
from typing import Any
from uuid import UUID

import requests

from services.storage.asset_storage import StoredAssetRef


class HeadAssetRepositoryError(RuntimeError):
    """Raised when durable head metadata cannot be read or persisted."""


@dataclass(frozen=True)
class HeadAssetRecord:
    id: UUID
    source_job_id: UUID
    user_id: UUID | None
    salon_id: UUID | None
    owner_type: str
    owner_id: UUID
    provider: str
    mesh_ref: StoredAssetRef
    coordinate_system: str
    unit: str
    scalp_anchor_version: str
    vertex_count: int | None
    polygon_count: int | None
    fit_metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    def to_job_output(self, *, reused_existing: bool = False) -> dict[str, Any]:
        return {
            "status": "success",
            "head_asset_id": str(self.id),
            "source_job_id": str(self.source_job_id),
            "provider": self.provider,
            "owner_type": self.owner_type,
            "owner_id": str(self.owner_id),
            "mesh_storage_ref": {
                "bucket": self.mesh_ref.bucket,
                "path": self.mesh_ref.path,
            },
            "coordinate_system": self.coordinate_system,
            "unit": self.unit,
            "scalp_anchor_version": self.scalp_anchor_version,
            "vertex_count": self.vertex_count,
            "polygon_count": self.polygon_count,
            "reused_existing": reused_existing,
            "created_at": self.created_at.isoformat(),
        }


def _parse_uuid(value: Any, field: str, *, optional: bool = False) -> UUID | None:
    if optional and value is None:
        return None
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise HeadAssetRepositoryError(f"Invalid {field} in head_assets response") from exc


def _parse_datetime(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise HeadAssetRepositoryError(f"Invalid {field} in head_assets response")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HeadAssetRepositoryError(f"Invalid {field} in head_assets response") from exc


def _parse_record(payload: Any) -> HeadAssetRecord:
    if not isinstance(payload, dict):
        raise HeadAssetRepositoryError("Invalid head_assets response payload")

    mesh_bucket = payload.get("mesh_bucket")
    mesh_path = payload.get("mesh_path")
    if not isinstance(mesh_bucket, str) or not mesh_bucket or not isinstance(mesh_path, str) or not mesh_path:
        raise HeadAssetRepositoryError("Invalid mesh storage reference in head_assets response")

    fit_metadata = payload.get("fit_metadata")
    if not isinstance(fit_metadata, dict):
        fit_metadata = {}

    return HeadAssetRecord(
        id=_parse_uuid(payload.get("id"), "id"),  # type: ignore[arg-type]
        source_job_id=_parse_uuid(payload.get("source_job_id"), "source_job_id"),  # type: ignore[arg-type]
        user_id=_parse_uuid(payload.get("user_id"), "user_id", optional=True),
        salon_id=_parse_uuid(payload.get("salon_id"), "salon_id", optional=True),
        owner_type=str(payload.get("owner_type") or ""),
        owner_id=_parse_uuid(payload.get("owner_id"), "owner_id"),  # type: ignore[arg-type]
        provider=str(payload.get("provider") or ""),
        mesh_ref=StoredAssetRef(mesh_bucket, mesh_path),
        coordinate_system=str(payload.get("coordinate_system") or ""),
        unit=str(payload.get("unit") or ""),
        scalp_anchor_version=str(payload.get("scalp_anchor_version") or ""),
        vertex_count=(int(payload["vertex_count"]) if payload.get("vertex_count") is not None else None),
        polygon_count=(int(payload["polygon_count"]) if payload.get("polygon_count") is not None else None),
        fit_metadata=fit_metadata,
        created_at=_parse_datetime(payload.get("created_at"), "created_at"),
        updated_at=_parse_datetime(payload.get("updated_at"), "updated_at"),
    )


class SupabaseHeadAssetRepository:
    """Service-role repository for canonical head metadata in PostgREST/Supabase."""

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
            raise HeadAssetRepositoryError("SUPABASE_URL must be an HTTP(S) URL")
        if os.getenv("FASTAPI_ENV", "").strip().lower() == "production" and not base_url.startswith("https://"):
            raise HeadAssetRepositoryError("SUPABASE_URL must use HTTPS in production")
        if not key:
            raise HeadAssetRepositoryError("SUPABASE_SERVICE_ROLE_KEY is required")

        self._rest_url = f"{base_url}/rest/v1"
        self._key = key
        self._session = session or requests.Session()

    @classmethod
    def from_env(cls) -> "SupabaseHeadAssetRepository":
        supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
        service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
        if not supabase_url or not service_role_key:
            raise HeadAssetRepositoryError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for head asset persistence"
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
            raise HeadAssetRepositoryError(f"Head asset persistence request failed: {exc}") from exc

        if not 200 <= int(response.status_code) < 300:
            detail = getattr(response, "text", "")
            raise HeadAssetRepositoryError(
                f"Head asset persistence returned HTTP {response.status_code}: {str(detail)[:300]}"
            )
        try:
            return response.json()
        except Exception as exc:
            raise HeadAssetRepositoryError("Head asset persistence returned invalid JSON") from exc

    def get_by_source_job(self, source_job_id: UUID) -> HeadAssetRecord | None:
        payload = self._request(
            "GET",
            f"{self._rest_url}/head_assets",
            headers=self._headers(),
            params={
                "source_job_id": f"eq.{source_job_id}",
                "select": "*",
                "limit": "1",
            },
        )
        if not isinstance(payload, list):
            raise HeadAssetRepositoryError("Invalid head_assets list response")
        if not payload:
            return None
        return _parse_record(payload[0])

    def persist(
        self,
        *,
        asset_id: UUID,
        source_job_id: UUID,
        provider: str,
        mesh_ref: StoredAssetRef,
        scalp_anchor_version: str,
        vertex_count: int | None,
        polygon_count: int | None,
        fit_metadata: dict[str, Any],
    ) -> HeadAssetRecord:
        payload = self._request(
            "POST",
            f"{self._rest_url}/rpc/persist_head_asset",
            headers=self._headers(),
            json={
                "p_id": str(asset_id),
                "p_source_job_id": str(source_job_id),
                "p_provider": provider,
                "p_mesh_bucket": mesh_ref.bucket,
                "p_mesh_path": mesh_ref.path,
                "p_scalp_anchor_version": scalp_anchor_version,
                "p_vertex_count": vertex_count,
                "p_polygon_count": polygon_count,
                "p_fit_metadata": fit_metadata,
            },
        )
        if not isinstance(payload, list) or len(payload) != 1:
            raise HeadAssetRepositoryError("persist_head_asset must return exactly one record")
        return _parse_record(payload[0])
