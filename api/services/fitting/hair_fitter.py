"""Durable HairFitter 3D alignment engine (BMAD Story 9.1)."""
from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import json
import math
from typing import Any, Mapping
from uuid import UUID


class HairFitterError(RuntimeError):
    """Base error for HairFitter operations."""


class HairFitterAssetUnpublishedError(HairFitterError):
    """Raised when an unpublished hair asset is submitted for fitting."""


class HairFitterAnchorError(HairFitterError):
    """Raised when required scalp anchors are invalid or corrupt."""


@dataclass(frozen=True)
class ScalpAnchor:
    name: str
    x: float
    y: float
    z: float

    def to_dict(self) -> dict[str, float]:
        return {"x": self.x, "y": self.y, "z": self.z}


@dataclass(frozen=True)
class FittedHairTransform:
    translation: tuple[float, float, float]
    rotation_euler_deg: tuple[float, float, float]
    scale: tuple[float, float, float]
    matrix_4x4: list[float]

    def to_dict(self) -> dict[str, Any]:
        return {
            "translation": list(self.translation),
            "rotation_euler_deg": list(self.rotation_euler_deg),
            "scale": list(self.scale),
            "matrix_4x4": self.matrix_4x4,
        }


@dataclass(frozen=True)
class FittedHairOutput:
    head_id: str
    style_id: str
    version: int
    transform: FittedHairTransform
    anchor_alignment_error_mm: float
    cache_key: str
    used_fallback_alignment: bool
    metadata: dict[str, Any] = field(default_factory=dict)


class HairFitter:
    """Computes deterministic 3D alignment matrix between CanonicalHead and CanonicalHairAsset."""

    def __init__(self, *, max_cache_entries: int = 1000) -> None:
        self.max_cache_entries = max_cache_entries
        self._cache: dict[str, FittedHairOutput] = {}

    @staticmethod
    def compute_cache_key(
        head_id: str,
        style_id: str,
        version: int,
        head_scalp_anchors: Mapping[str, Any] | None = None,
        hair_scalp_anchors: Mapping[str, Any] | None = None,
    ) -> str:
        payload = {
            "head_id": str(head_id).strip(),
            "style_id": str(style_id).strip(),
            "version": int(version),
            "head_anchors": head_scalp_anchors or {},
            "hair_anchors": hair_scalp_anchors or {},
        }
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:32]

    def fit(
        self,
        *,
        head_id: str,
        style_id: str,
        version: int,
        status: str = "published",
        head_scalp_anchors: Mapping[str, Any] | None = None,
        hair_scalp_anchors: Mapping[str, Any] | None = None,
        head_reference_scale: float = 1.0,
        hair_reference_scale: float = 1.0,
    ) -> FittedHairOutput:
        if status.lower() not in {"published", "validated"}:
            raise HairFitterAssetUnpublishedError(
                f"hair_asset_not_published: style={style_id} version={version} status={status}"
            )

        cache_key = self.compute_cache_key(
            head_id=head_id,
            style_id=style_id,
            version=version,
            head_scalp_anchors=head_scalp_anchors,
            hair_scalp_anchors=hair_scalp_anchors,
        )

        if cache_key in self._cache:
            return self._cache[cache_key]

        head_anchors = dict(head_scalp_anchors or {})
        hair_anchors = dict(hair_scalp_anchors or {})

        used_fallback = not bool(head_anchors and hair_anchors)

        # Scale calculation
        relative_scale = (
            (head_reference_scale / hair_reference_scale)
            if hair_reference_scale > 0
            else 1.0
        )
        scale_tuple = (relative_scale, relative_scale, relative_scale)

        # Center calculation (vertex / anchor average or default origin)
        if not used_fallback and "crown" in head_anchors and "crown" in hair_anchors:
            h_crown = head_anchors["crown"]
            ha_crown = hair_anchors["crown"]
            dx = float(h_crown.get("x", 0)) - float(ha_crown.get("x", 0)) * relative_scale
            dy = float(h_crown.get("y", 0)) - float(ha_crown.get("y", 0)) * relative_scale
            dz = float(h_crown.get("z", 0)) - float(ha_crown.get("z", 0)) * relative_scale
            alignment_error_mm = math.sqrt(dx * dx + dy * dy + dz * dz) * 1000.0
        else:
            dx, dy, dz = 0.0, 0.0, 0.0
            alignment_error_mm = 0.0

        translation_tuple = (round(dx, 6), round(dy, 6), round(dz, 6))
        rotation_tuple = (0.0, 0.0, 0.0)

        # Identity 4x4 matrix with translation & scale applied
        matrix_4x4 = [
            relative_scale, 0.0, 0.0, dx,
            0.0, relative_scale, 0.0, dy,
            0.0, 0.0, relative_scale, dz,
            0.0, 0.0, 0.0, 1.0,
        ]

        transform = FittedHairTransform(
            translation=translation_tuple,
            rotation_euler_deg=rotation_tuple,
            scale=scale_tuple,
            matrix_4x4=matrix_4x4,
        )

        output = FittedHairOutput(
            head_id=str(head_id),
            style_id=str(style_id),
            version=int(version),
            transform=transform,
            anchor_alignment_error_mm=round(alignment_error_mm, 3),
            cache_key=cache_key,
            used_fallback_alignment=used_fallback,
            metadata={
                "scalp_anchors_matched": len(set(head_anchors.keys()) & set(hair_anchors.keys())),
                "head_reference_scale": head_reference_scale,
                "hair_reference_scale": hair_reference_scale,
            },
        )

        if len(self._cache) >= self.max_cache_entries:
            self._cache.clear()

        self._cache[cache_key] = output
        return output
