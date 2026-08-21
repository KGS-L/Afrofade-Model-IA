"""Durable 3D Line-Up & Try-On Export Engine (BMAD Story 9.3)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
import hashlib
import json
from typing import Any, Mapping
from uuid import UUID

from services.storage.paths import tryon_export_ref
from services.storage.asset_storage import StoredAssetRef


class LineUpExportError(RuntimeError):
    """Base error for Line-Up export operations."""


class LineUpInvalidConfigError(LineUpExportError):
    """Raised when line-up parameters exceed physical constraints."""


@dataclass(frozen=True)
class LineUpConfig:
    hairline_offset_mm: float = 0.0      # [-15.0, +15.0]
    taper_fade_intensity: float = 0.5    # [0.0, 1.0]
    sideburn_contour_sharpness: float = 0.5  # [0.0, 1.0]

    def __post_init__(self) -> None:
        if not (-15.0 <= self.hairline_offset_mm <= 15.0):
            raise LineUpInvalidConfigError(
                f"hairline_offset_mm out of bounds [-15, +15]: {self.hairline_offset_mm}"
            )
        if not (0.0 <= self.taper_fade_intensity <= 1.0):
            raise LineUpInvalidConfigError(
                f"taper_fade_intensity out of bounds [0, 1]: {self.taper_fade_intensity}"
            )
        if not (0.0 <= self.sideburn_contour_sharpness <= 1.0):
            raise LineUpInvalidConfigError(
                f"sideburn_contour_sharpness out of bounds [0, 1]: {self.sideburn_contour_sharpness}"
            )

    def to_dict(self) -> dict[str, float]:
        return {
            "hairline_offset_mm": self.hairline_offset_mm,
            "taper_fade_intensity": self.taper_fade_intensity,
            "sideburn_contour_sharpness": self.sideburn_contour_sharpness,
        }


@dataclass(frozen=True)
class TryOnExportRecord:
    export_id: UUID
    user_id: UUID
    head_id: str
    head_version: int
    style_id: str
    style_version: int
    lineup_config: LineUpConfig
    export_ref: StoredAssetRef
    created_at: datetime
    idempotency_key: str
    metadata: dict[str, Any] = field(default_factory=dict)


class LineUpExportEngine:
    """Manages 3D line-up adjustments and produces durable try-on export references."""

    def __init__(self) -> None:
        self._exports_by_key: dict[str, TryOnExportRecord] = {}

    def compute_idempotency_key(
        self,
        *,
        user_id: UUID,
        head_id: str,
        head_version: int,
        style_id: str,
        style_version: int,
        lineup_config: LineUpConfig,
    ) -> str:
        payload = {
            "user_id": str(user_id),
            "head_id": str(head_id).strip(),
            "head_version": int(head_version),
            "style_id": str(style_id).strip(),
            "style_version": int(style_version),
            "lineup": lineup_config.to_dict(),
        }
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:32]

    def create_export(
        self,
        *,
        export_id: UUID,
        user_id: UUID,
        head_id: str,
        head_version: int = 1,
        style_id: str,
        style_version: int = 1,
        lineup_config: LineUpConfig | None = None,
        filename: str = "tryon-export.png",
    ) -> TryOnExportRecord:
        config = lineup_config or LineUpConfig()

        key = self.compute_idempotency_key(
            user_id=user_id,
            head_id=head_id,
            head_version=head_version,
            style_id=style_id,
            style_version=style_version,
            lineup_config=config,
        )

        if key in self._exports_by_key:
            return self._exports_by_key[key]

        export_ref = tryon_export_ref(export_id, filename, user_id=user_id)

        record = TryOnExportRecord(
            export_id=export_id,
            user_id=user_id,
            head_id=str(head_id).strip(),
            head_version=int(head_version),
            style_id=str(style_id).strip(),
            style_version=int(style_version),
            lineup_config=config,
            export_ref=export_ref,
            created_at=datetime.now(UTC),
            idempotency_key=key,
            metadata={
                "bucket": export_ref.bucket,
                "path": export_ref.path,
                "storage_provider": "supabase_private_tryons",
            },
        )

        self._exports_by_key[key] = record
        return record
