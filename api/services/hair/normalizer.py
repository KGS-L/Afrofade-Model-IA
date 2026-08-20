"""Provider-neutral canonical hair asset normalization for Afrofade.

Story 8.3 deliberately separates provider generation from catalog fitness. A provider
may produce a valid GLB and still fail this gate if its coordinate metadata,
physical scale, polygon budget, or geometry are not fit for the reusable Afrofade
catalog contract.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from io import BytesIO
import json
import logging
import math
from typing import Any

import numpy as np
from PIL import Image, ImageDraw
import trimesh

from services.hair.hair_asset_repository import (
    HairAssetVersionRecord,
    HairAssetVersionRepository,
    SupabaseHairAssetVersionRepository,
)
from services.storage.asset_storage import AssetStorage, StoredAssetRef
from services.storage.paths import canonical_hair_asset_ref
from services.storage.supabase_storage import SupabaseAssetStorage

logger = logging.getLogger("afrofade.hair.normalizer")

CANONICAL_COORDINATE_SYSTEM = "Y_UP_RIGHT_HANDED"
CANONICAL_UNIT = "meter"
HAIR_NORMALIZATION_POLICY_VERSION = "afrofade-hair-normalizer-v1"
SCALP_ANCHOR_VERSION = "afrofade-hair-anchors-v1"
ANCHOR_MAP_SCHEMA_VERSION = "afrofade-hair-anchor-map-v1"
VALIDATION_REPORT_SCHEMA_VERSION = "afrofade-hair-validation-v1"

SUPPORTED_COORDINATE_SYSTEMS = {
    "Y_UP_RIGHT_HANDED",
    "Z_UP_RIGHT_HANDED",
    "Y_UP_LEFT_HANDED",
    "Z_UP_LEFT_HANDED",
}
UNIT_TO_METERS = {
    "meter": 1.0,
    "centimeter": 0.01,
    "millimeter": 0.001,
}
AXES = {
    "+X": np.array([1.0, 0.0, 0.0]),
    "-X": np.array([-1.0, 0.0, 0.0]),
    "+Y": np.array([0.0, 1.0, 0.0]),
    "-Y": np.array([0.0, -1.0, 0.0]),
    "+Z": np.array([0.0, 0.0, 1.0]),
    "-Z": np.array([0.0, 0.0, -1.0]),
}


class HairAssetNormalizationError(RuntimeError):
    """Raised when a raw provider mesh cannot become a valid canonical hair asset."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        validation_report: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.validation_report = validation_report or {}


@dataclass(frozen=True)
class HairAssetNormalizationPolicy:
    max_polygons: int = 60_000
    lod_ratios: tuple[float, ...] = (0.5, 0.25)
    min_lod_polygons: int = 256
    preview_size: int = 512
    min_extent_m: float = 0.005
    max_extent_m: float = 2.0
    canonical_scalp_span_m: float = 0.18

    def __post_init__(self) -> None:
        if self.max_polygons < 1:
            raise ValueError("hair_normalizer_max_polygons_must_be_positive")
        if self.min_lod_polygons < 4:
            raise ValueError("hair_normalizer_min_lod_polygons_too_small")
        if self.preview_size < 64:
            raise ValueError("hair_normalizer_preview_size_too_small")
        if not 0 < self.min_extent_m < self.max_extent_m:
            raise ValueError("hair_normalizer_extent_policy_invalid")
        if self.canonical_scalp_span_m <= 0:
            raise ValueError("hair_normalizer_canonical_scalp_span_invalid")
        if any(not 0 < ratio < 1 for ratio in self.lod_ratios):
            raise ValueError("hair_normalizer_lod_ratio_invalid")
        if tuple(sorted(self.lod_ratios, reverse=True)) != self.lod_ratios:
            raise ValueError("hair_normalizer_lod_ratios_must_descend")


@dataclass(frozen=True)
class HairAssetNormalizationRequest:
    style_id: str
    version: int
    provider: str
    raw_ref: StoredAssetRef
    raw_glb_bytes: bytes
    source_coordinate_system: str = CANONICAL_COORDINATE_SYSTEM
    source_unit: str = CANONICAL_UNIT
    source_forward_axis: str = "+Z"
    source_scale: float = 1.0
    source_reference_span: float | None = None
    provider_metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class HairAssetNormalizationResult:
    record: HairAssetVersionRecord
    canonical_ref: StoredAssetRef
    preview_ref: StoredAssetRef
    anchor_map_ref: StoredAssetRef
    lod_refs: tuple[StoredAssetRef, ...]
    validation_report: dict[str, Any]


class HairAssetNormalizer:
    """Convert one raw hair version into an immutable-ready canonical catalog asset."""

    def __init__(
        self,
        *,
        storage: AssetStorage | None = None,
        repository: HairAssetVersionRepository | None = None,
        policy: HairAssetNormalizationPolicy | None = None,
    ) -> None:
        self.storage = storage or SupabaseAssetStorage.from_env()
        self.repository = repository or SupabaseHairAssetVersionRepository.from_env()
        self.policy = policy or HairAssetNormalizationPolicy()

    def normalize(self, request: HairAssetNormalizationRequest) -> HairAssetNormalizationResult:
        self._validate_request(request)
        record = self.repository.get_version(request.style_id, request.version)
        self._validate_version_provenance(record, request)
        assert record is not None

        uploaded: list[StoredAssetRef] = []
        report = self._base_report(request)

        try:
            mesh = self._load_glb(request.raw_glb_bytes)
            report["source"].update(self._mesh_snapshot(mesh))

            mesh, transform_report, transform_warnings = self._canonicalize_geometry(mesh, request)
            report["transform"] = transform_report
            report["warnings"].extend(transform_warnings)
            report["canonical"].update(self._mesh_snapshot(mesh))
            report["canonical"].update(
                {
                    "coordinate_system": CANONICAL_COORDINATE_SYSTEM,
                    "unit": CANONICAL_UNIT,
                }
            )

            polygon_count = int(len(mesh.faces))
            if polygon_count > self.policy.max_polygons:
                self._fail(
                    report,
                    "polygon_budget_exceeded",
                    (
                        f"Canonical hair mesh has {polygon_count} polygons; "
                        f"budget is {self.policy.max_polygons}. Provider-side remesh is required."
                    ),
                )
            report["polygon_budget"] = {
                "max_polygons": self.policy.max_polygons,
                "actual_polygons": polygon_count,
                "passed": True,
                "canonical_mesh_decimated": False,
            }

            lod_meshes = self._build_lods(mesh)
            lod_payloads: list[tuple[StoredAssetRef, bytes, dict[str, Any]]] = []
            for level, (ratio, lod_mesh) in enumerate(lod_meshes, start=1):
                lod_ref = canonical_hair_asset_ref(
                    request.style_id,
                    request.version,
                    f"lod-{level}.glb",
                )
                lod_info = {
                    "level": level,
                    "ratio": ratio,
                    "bucket": lod_ref.bucket,
                    "path": lod_ref.path,
                    "polygon_count": int(len(lod_mesh.faces)),
                    "strategy": "deterministic_face_subsample",
                }
                lod_payloads.append((lod_ref, self._export_glb(lod_mesh), lod_info))
            report["lods"] = [info for _, _, info in lod_payloads]
            if lod_payloads:
                report["warnings"].append(
                    "lods_use_deterministic_face_subsample; canonical mesh remains untouched"
                )

            anchor_map = self._build_anchor_map(mesh)
            anchor_bytes = json.dumps(
                anchor_map,
                ensure_ascii=False,
                separators=(",", ":"),
                sort_keys=True,
            ).encode("utf-8")
            report["anchors"] = {
                "schema_version": ANCHOR_MAP_SCHEMA_VERSION,
                "scalp_anchor_version": SCALP_ANCHOR_VERSION,
                "method": anchor_map["method"],
                "count": len(anchor_map["anchors"]),
            }

            preview_bytes = self._render_preview(mesh)
            report["preview"] = {
                "format": "webp",
                "width": self.policy.preview_size,
                "height": self.policy.preview_size,
                "renderer": "cpu_orthographic_geometry_v1",
            }

            canonical_bytes = self._export_glb(mesh)
            canonical_ref = canonical_hair_asset_ref(
                request.style_id,
                request.version,
                "hair.glb",
            )
            preview_ref = canonical_hair_asset_ref(
                request.style_id,
                request.version,
                "preview.webp",
            )
            anchor_map_ref = canonical_hair_asset_ref(
                request.style_id,
                request.version,
                "anchors.json",
            )

            uploads: list[tuple[StoredAssetRef, bytes, str]] = [
                (canonical_ref, canonical_bytes, "model/gltf-binary"),
                (preview_ref, preview_bytes, "image/webp"),
                (anchor_map_ref, anchor_bytes, "application/json"),
                *[
                    (lod_ref, lod_bytes, "model/gltf-binary")
                    for lod_ref, lod_bytes, _ in lod_payloads
                ],
            ]
            for asset_ref, payload, content_type in uploads:
                self.storage.put_object(
                    asset_ref,
                    payload,
                    content_type=content_type,
                    upsert=True,
                )
                uploaded.append(asset_ref)

            report["valid"] = True
            report["errors"] = []
            report["storage"] = {
                "canonical": self._ref_payload(canonical_ref),
                "preview": self._ref_payload(preview_ref),
                "anchor_map": self._ref_payload(anchor_map_ref),
            }

            provider_metadata = {
                **request.provider_metadata,
                "normalization": {
                    "policy_version": HAIR_NORMALIZATION_POLICY_VERSION,
                    "source_coordinate_system": request.source_coordinate_system,
                    "source_unit": request.source_unit,
                    "source_forward_axis": request.source_forward_axis,
                    "source_scale": request.source_scale,
                    "source_reference_span": request.source_reference_span,
                },
            }
            persisted = self.repository.persist_normalization(
                style_id=request.style_id,
                version=request.version,
                provider=request.provider,
                raw_ref=request.raw_ref,
                canonical_ref=canonical_ref,
                preview_ref=preview_ref,
                anchor_map_ref=anchor_map_ref,
                scalp_anchor_version=SCALP_ANCHOR_VERSION,
                polygon_count=polygon_count,
                lods=[info for _, _, info in lod_payloads],
                provider_metadata=provider_metadata,
                validation_report=report,
            )
            if persisted.status != "validated":
                raise HairAssetNormalizationError(
                    "normalization_metadata_not_validated",
                    "Hair asset normalization persistence did not return validated status",
                    validation_report=report,
                )

            return HairAssetNormalizationResult(
                record=persisted,
                canonical_ref=canonical_ref,
                preview_ref=preview_ref,
                anchor_map_ref=anchor_map_ref,
                lod_refs=tuple(ref for ref, _, _ in lod_payloads),
                validation_report=report,
            )

        except HairAssetNormalizationError as exc:
            self._cleanup_uploaded(uploaded)
            if not exc.validation_report:
                report["valid"] = False
                report["errors"] = [{"code": exc.code, "message": str(exc)}]
                exc.validation_report = report
            self._record_failure_best_effort(request, exc.validation_report)
            raise
        except Exception as exc:
            self._cleanup_uploaded(uploaded)
            report["valid"] = False
            report["errors"] = [
                {
                    "code": "normalization_pipeline_failed",
                    "message": str(exc),
                }
            ]
            self._record_failure_best_effort(request, report)
            raise HairAssetNormalizationError(
                "normalization_pipeline_failed",
                f"Hair asset normalization failed: {exc}",
                validation_report=report,
            ) from exc

    def _validate_request(self, request: HairAssetNormalizationRequest) -> None:
        if not request.style_id.strip():
            raise HairAssetNormalizationError("style_id_required", "Hair style id is required")
        if request.version < 1:
            raise HairAssetNormalizationError("invalid_version", "Hair asset version must be >= 1")
        if request.provider not in {"trellis2", "hunyuan_multiview", "meshy", "manual"}:
            raise HairAssetNormalizationError("invalid_provider", "Unknown hair asset provider")
        if request.raw_ref.bucket != "hair-assets":
            raise HairAssetNormalizationError("invalid_raw_bucket", "Raw hair asset must use hair-assets bucket")
        expected_prefix = f"raw/styles/{request.style_id}/v{request.version}/"
        if not request.raw_ref.path.startswith(expected_prefix):
            raise HairAssetNormalizationError(
                "invalid_raw_path",
                f"Raw hair asset path must start with {expected_prefix}",
            )
        if not request.raw_glb_bytes:
            raise HairAssetNormalizationError("empty_raw_mesh", "Raw GLB payload is empty")
        coordinate_system = request.source_coordinate_system.strip().upper()
        if coordinate_system not in SUPPORTED_COORDINATE_SYSTEMS:
            raise HairAssetNormalizationError(
                "unsupported_coordinate_system",
                f"Unsupported source coordinate system: {request.source_coordinate_system}",
            )
        if request.source_unit.strip().lower() not in UNIT_TO_METERS:
            raise HairAssetNormalizationError(
                "unsupported_source_unit",
                f"Unsupported source unit: {request.source_unit}",
            )
        if request.source_forward_axis.strip().upper() not in AXES:
            raise HairAssetNormalizationError(
                "unsupported_forward_axis",
                f"Unsupported source forward axis: {request.source_forward_axis}",
            )
        if not math.isfinite(float(request.source_scale)) or request.source_scale <= 0:
            raise HairAssetNormalizationError("invalid_source_scale", "Source scale must be positive")
        if request.source_reference_span is not None and (
            not math.isfinite(float(request.source_reference_span))
            or request.source_reference_span <= 0
        ):
            raise HairAssetNormalizationError(
                "invalid_source_reference_span",
                "Source reference span must be positive when provided",
            )
        if not isinstance(request.provider_metadata, dict):
            raise HairAssetNormalizationError(
                "invalid_provider_metadata",
                "Provider metadata must be an object",
            )

    @staticmethod
    def _validate_version_provenance(
        record: HairAssetVersionRecord | None,
        request: HairAssetNormalizationRequest,
    ) -> None:
        if record is None:
            raise HairAssetNormalizationError(
                "hair_asset_version_not_found",
                "Hair asset version must exist as a raw draft before normalization",
            )
        if record.status != "draft":
            raise HairAssetNormalizationError(
                "hair_asset_version_not_draft",
                f"Hair asset version is {record.status}; only draft versions can be normalized",
            )
        if record.provider != request.provider:
            raise HairAssetNormalizationError(
                "provider_provenance_mismatch",
                "Normalization provider does not match persisted raw provenance",
            )
        if record.raw_ref != request.raw_ref:
            raise HairAssetNormalizationError(
                "raw_asset_provenance_mismatch",
                "Normalization raw storage reference does not match persisted raw provenance",
            )

    def _base_report(self, request: HairAssetNormalizationRequest) -> dict[str, Any]:
        return {
            "schema_version": VALIDATION_REPORT_SCHEMA_VERSION,
            "policy_version": HAIR_NORMALIZATION_POLICY_VERSION,
            "valid": False,
            "errors": [],
            "warnings": [],
            "style_id": request.style_id,
            "version": request.version,
            "provider": request.provider,
            "source": {
                "coordinate_system": request.source_coordinate_system,
                "unit": request.source_unit,
                "forward_axis": request.source_forward_axis,
                "raw_storage": self._ref_payload(request.raw_ref),
            },
            "canonical": {},
            "polygon_budget": {},
            "lods": [],
            "anchors": {},
            "preview": {},
        }

    def _load_glb(self, payload: bytes) -> trimesh.Trimesh:
        try:
            loaded = trimesh.load(
                file_obj=BytesIO(payload),
                file_type="glb",
                force="scene",
                process=False,
            )
        except Exception as exc:
            raise HairAssetNormalizationError(
                "invalid_glb",
                f"Raw provider output is not a readable GLB: {exc}",
            ) from exc

        if isinstance(loaded, trimesh.Scene):
            if not loaded.geometry:
                raise HairAssetNormalizationError("empty_mesh", "GLB scene contains no geometry")
            if hasattr(loaded, "to_geometry"):
                mesh = loaded.to_geometry()
            else:
                mesh = loaded.dump(concatenate=True)
        elif isinstance(loaded, trimesh.Trimesh):
            mesh = loaded
        else:
            raise HairAssetNormalizationError("invalid_mesh_type", "GLB did not decode to triangle geometry")

        if not isinstance(mesh, trimesh.Trimesh) or len(mesh.vertices) < 3 or len(mesh.faces) < 1:
            raise HairAssetNormalizationError("empty_mesh", "GLB mesh contains no usable triangles")
        if not np.isfinite(np.asarray(mesh.vertices)).all():
            raise HairAssetNormalizationError("non_finite_vertices", "Hair mesh contains NaN/Inf vertices")
        faces = np.asarray(mesh.faces)
        if faces.ndim != 2 or faces.shape[1] != 3:
            raise HairAssetNormalizationError("non_triangular_mesh", "Hair mesh must be triangulated")

        mesh = mesh.copy()
        self._remove_degenerate_faces(mesh)
        if len(mesh.faces) < 1:
            raise HairAssetNormalizationError("degenerate_mesh", "Hair mesh contains only degenerate faces")
        return mesh

    def _canonicalize_geometry(
        self,
        mesh: trimesh.Trimesh,
        request: HairAssetNormalizationRequest,
    ) -> tuple[trimesh.Trimesh, dict[str, Any], list[str]]:
        coordinate_system = request.source_coordinate_system.strip().upper()
        source_unit = request.source_unit.strip().lower()
        forward_axis_name = request.source_forward_axis.strip().upper()
        up_axis = np.array([0.0, 1.0, 0.0]) if coordinate_system.startswith("Y_UP") else np.array([0.0, 0.0, 1.0])
        forward_axis = AXES[forward_axis_name]
        if abs(float(np.dot(up_axis, forward_axis))) > 1e-8:
            raise HairAssetNormalizationError(
                "forward_axis_parallel_to_up",
                "Source forward axis cannot be parallel to source up axis",
            )

        right_axis = np.cross(up_axis, forward_axis)
        right_axis = right_axis / np.linalg.norm(right_axis)
        if coordinate_system.endswith("LEFT_HANDED"):
            right_axis = -right_axis

        basis = np.column_stack([right_axis, up_axis, forward_axis])
        linear = basis.T
        orientation = np.eye(4)
        orientation[:3, :3] = linear
        mesh.apply_transform(orientation)

        unit_scale = UNIT_TO_METERS[source_unit]
        explicit_scale = float(request.source_scale)
        metric_scale = unit_scale * explicit_scale
        mesh.apply_scale(metric_scale)

        reference_scale = 1.0
        warnings: list[str] = []
        if request.source_reference_span is not None:
            observed_reference_m = float(request.source_reference_span) * metric_scale
            reference_scale = self.policy.canonical_scalp_span_m / observed_reference_m
            mesh.apply_scale(reference_scale)
        else:
            warnings.append(
                "source_reference_span_missing; metric scale preserved after unit/source-scale conversion"
            )

        bounds = np.asarray(mesh.bounds, dtype=float)
        center_x = float((bounds[0, 0] + bounds[1, 0]) / 2.0)
        center_z = float((bounds[0, 2] + bounds[1, 2]) / 2.0)
        min_y = float(bounds[0, 1])
        translation = np.array([-center_x, -min_y, -center_z], dtype=float)
        mesh.apply_translation(translation)
        self._remove_degenerate_faces(mesh)
        mesh.remove_unreferenced_vertices()

        extents = np.asarray(mesh.extents, dtype=float)
        max_extent = float(extents.max())
        if not np.isfinite(extents).all() or max_extent <= 0:
            raise HairAssetNormalizationError("invalid_canonical_extent", "Canonical mesh extent is invalid")
        if max_extent < self.policy.min_extent_m or max_extent > self.policy.max_extent_m:
            raise HairAssetNormalizationError(
                "canonical_extent_out_of_range",
                (
                    f"Canonical mesh max extent {max_extent:.6f}m is outside "
                    f"[{self.policy.min_extent_m}, {self.policy.max_extent_m}]m"
                ),
            )

        mesh.metadata["afrofade_coordinate_system"] = CANONICAL_COORDINATE_SYSTEM
        mesh.metadata["afrofade_unit"] = CANONICAL_UNIT
        mesh.metadata["afrofade_normalizer"] = HAIR_NORMALIZATION_POLICY_VERSION

        return (
            mesh,
            {
                "orientation_matrix": orientation.tolist(),
                "source_unit_to_meters": unit_scale,
                "source_scale": explicit_scale,
                "metric_scale": metric_scale,
                "reference_scale": reference_scale,
                "combined_scale": metric_scale * reference_scale,
                "translation_m": translation.tolist(),
                "canonical_front_axis": "+Z",
                "canonical_up_axis": "+Y",
            },
            warnings,
        )

    def _build_lods(self, mesh: trimesh.Trimesh) -> list[tuple[float, trimesh.Trimesh]]:
        source_faces = int(len(mesh.faces))
        lods: list[tuple[float, trimesh.Trimesh]] = []
        for ratio in self.policy.lod_ratios:
            target = max(self.policy.min_lod_polygons, int(source_faces * ratio))
            target = min(target, source_faces - 1)
            if target < 4 or target >= source_faces:
                continue
            indices = (
                np.arange(target, dtype=np.int64) * source_faces // target
            ).astype(np.int64)
            lod = mesh.submesh([indices], append=True, repair=False)
            if not isinstance(lod, trimesh.Trimesh) or len(lod.faces) < 1:
                raise HairAssetNormalizationError(
                    "lod_generation_failed",
                    f"Unable to generate LOD at ratio {ratio}",
                )
            lods.append((ratio, lod))
        return lods

    def _build_anchor_map(self, mesh: trimesh.Trimesh) -> dict[str, Any]:
        vertices = np.asarray(mesh.vertices, dtype=float)
        x, y, z = vertices[:, 0], vertices[:, 1], vertices[:, 2]
        y40, y65, y80 = np.quantile(y, [0.40, 0.65, 0.80])
        bounds = np.asarray(mesh.bounds, dtype=float)
        x_span = max(float(bounds[1, 0] - bounds[0, 0]), 1e-9)
        y_span = max(float(bounds[1, 1] - bounds[0, 1]), 1e-9)
        z_span = max(float(bounds[1, 2] - bounds[0, 2]), 1e-9)

        upper = y >= y65
        temple_band = (y >= y40) & (y <= max(y80, y40 + y_span * 0.05))
        if not upper.any():
            upper = np.ones(len(vertices), dtype=bool)
        if not temple_band.any():
            temple_band = np.ones(len(vertices), dtype=bool)

        targets: dict[str, tuple[np.ndarray, np.ndarray]] = {
            "crown": (upper, np.array([0.0, float(y.max()), 0.0])),
            "front_center": (upper, np.array([0.0, float(y80), float(z.max())])),
            "back_center": (upper, np.array([0.0, float(y80), float(z.min())])),
            "left_temple": (
                temple_band,
                np.array([float(x.min()), float((y40 + y80) / 2.0), float(z.max() - z_span * 0.25)]),
            ),
            "right_temple": (
                temple_band,
                np.array([float(x.max()), float((y40 + y80) / 2.0), float(z.max() - z_span * 0.25)]),
            ),
            "front_left": (
                upper,
                np.array([-x_span * 0.25, float(y80), float(z.max())]),
            ),
            "front_right": (
                upper,
                np.array([x_span * 0.25, float(y80), float(z.max())]),
            ),
        }

        anchors: dict[str, Any] = {}
        for name, (mask, target) in targets.items():
            indices = np.flatnonzero(mask)
            candidate_vertices = vertices[indices]
            normalized_delta = candidate_vertices - target
            normalized_delta[:, 0] /= x_span
            normalized_delta[:, 1] /= y_span
            normalized_delta[:, 2] /= z_span
            distance = np.einsum("ij,ij->i", normalized_delta, normalized_delta)
            vertex_index = int(indices[int(np.argmin(distance))])
            position = vertices[vertex_index]
            anchors[name] = {
                "vertex_index": vertex_index,
                "position": [round(float(value), 8) for value in position],
            }

        return {
            "schema_version": ANCHOR_MAP_SCHEMA_VERSION,
            "scalp_anchor_version": SCALP_ANCHOR_VERSION,
            "coordinate_system": CANONICAL_COORDINATE_SYSTEM,
            "unit": CANONICAL_UNIT,
            "front_axis": "+Z",
            "up_axis": "+Y",
            "method": "geometry_extrema_quantile_v1",
            "confidence": "geometric",
            "anchors": anchors,
            "bounds": {
                "min": [round(float(v), 8) for v in bounds[0]],
                "max": [round(float(v), 8) for v in bounds[1]],
            },
        }

    def _render_preview(self, mesh: trimesh.Trimesh) -> bytes:
        size = self.policy.preview_size
        padding = max(8, int(size * 0.06))
        vertices = np.asarray(mesh.vertices, dtype=float)
        faces = np.asarray(mesh.faces, dtype=np.int64)
        x = vertices[:, 0]
        y = vertices[:, 1]
        width = max(float(x.max() - x.min()), 1e-9)
        height = max(float(y.max() - y.min()), 1e-9)
        scale = min((size - 2 * padding) / width, (size - 2 * padding) / height)
        px = (x - x.min()) * scale + (size - width * scale) / 2.0
        py = size - ((y - y.min()) * scale + (size - height * scale) / 2.0)

        image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image, "RGBA")
        depth = vertices[faces][:, :, 2].mean(axis=1)
        order = np.argsort(depth)
        dmin = float(depth.min()) if len(depth) else 0.0
        dspan = max(float(depth.max() - dmin), 1e-9) if len(depth) else 1.0
        for face_index in order:
            face = faces[int(face_index)]
            shade = int(45 + 120 * ((float(depth[int(face_index)]) - dmin) / dspan))
            points = [(float(px[idx]), float(py[idx])) for idx in face]
            draw.polygon(points, fill=(shade, shade, shade, 255))

        output = BytesIO()
        image.save(output, format="WEBP", lossless=True, quality=90, method=4)
        payload = output.getvalue()
        if not payload:
            raise HairAssetNormalizationError("preview_generation_failed", "Preview renderer produced no bytes")
        return payload

    @staticmethod
    def _mesh_snapshot(mesh: trimesh.Trimesh) -> dict[str, Any]:
        bounds = np.asarray(mesh.bounds, dtype=float)
        extents = np.asarray(mesh.extents, dtype=float)
        return {
            "vertex_count": int(len(mesh.vertices)),
            "polygon_count": int(len(mesh.faces)),
            "bounds": {
                "min": [float(v) for v in bounds[0]],
                "max": [float(v) for v in bounds[1]],
            },
            "extents": [float(v) for v in extents],
        }

    @staticmethod
    def _remove_degenerate_faces(mesh: trimesh.Trimesh) -> None:
        vertices = np.asarray(mesh.vertices, dtype=float)
        faces = np.asarray(mesh.faces, dtype=np.int64)
        if len(faces) == 0:
            return
        triangles = vertices[faces]
        cross = np.cross(
            triangles[:, 1] - triangles[:, 0],
            triangles[:, 2] - triangles[:, 0],
        )
        keep = np.linalg.norm(cross, axis=1) > 1e-12
        if not keep.all():
            mesh.update_faces(keep)
            mesh.remove_unreferenced_vertices()

    @staticmethod
    def _export_glb(mesh: trimesh.Trimesh) -> bytes:
        payload = mesh.export(file_type="glb")
        if not isinstance(payload, (bytes, bytearray)) or not payload:
            raise HairAssetNormalizationError("glb_export_failed", "Canonical GLB export produced no bytes")
        return bytes(payload)

    @staticmethod
    def _ref_payload(asset: StoredAssetRef) -> dict[str, str]:
        return {"bucket": asset.bucket, "path": asset.path}

    def _fail(self, report: dict[str, Any], code: str, message: str) -> None:
        report["valid"] = False
        report["errors"] = [{"code": code, "message": message}]
        raise HairAssetNormalizationError(
            code,
            message,
            validation_report=report,
        )

    def _cleanup_uploaded(self, uploaded: list[StoredAssetRef]) -> None:
        for asset_ref in reversed(uploaded):
            try:
                self.storage.delete_object(asset_ref)
            except Exception as cleanup_error:  # pragma: no cover - best effort only
                logger.warning("Unable to clean orphaned hair asset %s: %s", asset_ref, cleanup_error)

    def _record_failure_best_effort(
        self,
        request: HairAssetNormalizationRequest,
        report: dict[str, Any],
    ) -> None:
        if not report.get("errors"):
            report["valid"] = False
            report["errors"] = [
                {
                    "code": "normalization_failed",
                    "message": "Hair asset normalization failed",
                }
            ]
        try:
            self.repository.record_validation_failure(
                style_id=request.style_id,
                version=request.version,
                validation_report=report,
            )
        except Exception as error:  # pragma: no cover - failure audit is best effort
            logger.warning(
                "Unable to persist hair normalization failure style=%s version=%s: %s",
                request.style_id,
                request.version,
                error,
            )
