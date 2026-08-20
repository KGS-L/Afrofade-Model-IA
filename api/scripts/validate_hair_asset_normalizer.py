#!/usr/bin/env python3
"""Deterministic provider-free validation for BMAD Story 8.3 HairAssetNormalizer."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime
from io import BytesIO
import json
from pathlib import Path
import sys
from typing import Any, BinaryIO
from uuid import UUID

import trimesh

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.hair.hair_asset_repository import (
    HairAssetVersionRecord,
    SupabaseHairAssetVersionRepository,
)
from services.hair.normalizer import (
    CANONICAL_COORDINATE_SYSTEM,
    CANONICAL_UNIT,
    HAIR_NORMALIZATION_POLICY_VERSION,
    SCALP_ANCHOR_VERSION,
    HairAssetNormalizationError,
    HairAssetNormalizationPolicy,
    HairAssetNormalizationRequest,
    HairAssetNormalizer,
)
from services.storage.asset_storage import AssetStorage, SignedUpload, StoredAssetRef
from services.storage.paths import canonical_hair_asset_ref, raw_hair_asset_ref


STYLE_ID = "afro-1"
VERSION = 1
ASSET_ID = UUID("11111111-1111-4111-8111-111111111111")
NOW = datetime.now(UTC)


class MemoryAssetStorage(AssetStorage):
    def __init__(self) -> None:
        self.objects: dict[StoredAssetRef, tuple[bytes, str]] = {}
        self.deleted: list[StoredAssetRef] = []

    def put_object(
        self,
        asset: StoredAssetRef,
        source: bytes | BinaryIO,
        *,
        content_type: str,
        upsert: bool = False,
    ) -> StoredAssetRef:
        payload = source if isinstance(source, bytes) else source.read()
        if not isinstance(payload, bytes) or not payload:
            raise AssertionError("MemoryAssetStorage received an empty object")
        if not upsert and asset in self.objects:
            raise AssertionError("MemoryAssetStorage duplicate object without upsert")
        self.objects[asset] = (payload, content_type)
        return asset

    def delete_object(self, asset: StoredAssetRef) -> None:
        self.deleted.append(asset)
        self.objects.pop(asset, None)

    def create_signed_read(self, asset: StoredAssetRef, *, expires_in: int = 300) -> str:
        return f"https://assets.example.test/{asset.bucket}/{asset.path}?ttl={expires_in}"

    def create_signed_upload(self, asset: StoredAssetRef, *, upsert: bool = False) -> SignedUpload:
        return SignedUpload(asset=asset, signed_url="https://upload.example.test", token="test")

    def exists(self, asset: StoredAssetRef) -> bool:
        return asset in self.objects

    def metadata(self, asset: StoredAssetRef) -> dict[str, Any] | None:
        stored = self.objects.get(asset)
        if stored is None:
            return None
        payload, content_type = stored
        return {"size": len(payload), "content_type": content_type}


class MemoryHairAssetRepository:
    def __init__(self, record: HairAssetVersionRecord) -> None:
        self.record = record
        self.failure_reports: list[dict[str, Any]] = []
        self.persist_calls: list[dict[str, Any]] = []

    def get_version(self, style_id: str, version: int) -> HairAssetVersionRecord | None:
        if self.record.style_id == style_id and self.record.version == version:
            return self.record
        return None

    def persist_normalization(self, **kwargs: Any) -> HairAssetVersionRecord:
        self.persist_calls.append(kwargs)
        self.record = replace(
            self.record,
            canonical_ref=kwargs["canonical_ref"],
            preview_ref=kwargs["preview_ref"],
            anchor_map_ref=kwargs["anchor_map_ref"],
            coordinate_system=CANONICAL_COORDINATE_SYSTEM,
            unit=CANONICAL_UNIT,
            scalp_anchor_version=kwargs["scalp_anchor_version"],
            polygon_count=kwargs["polygon_count"],
            lods=kwargs["lods"],
            provider_metadata={**self.record.provider_metadata, **kwargs["provider_metadata"]},
            validation_report=kwargs["validation_report"],
            status="validated",
            updated_at=datetime.now(UTC),
        )
        return self.record

    def record_validation_failure(self, **kwargs: Any) -> HairAssetVersionRecord:
        report = kwargs["validation_report"]
        self.failure_reports.append(report)
        self.record = replace(
            self.record,
            validation_report=report,
            updated_at=datetime.now(UTC),
        )
        return self.record


def draft_record(raw_ref: StoredAssetRef) -> HairAssetVersionRecord:
    return HairAssetVersionRecord(
        id=ASSET_ID,
        style_id=STYLE_ID,
        version=VERSION,
        provider="manual",
        source_job_id=None,
        raw_ref=raw_ref,
        canonical_ref=None,
        preview_ref=None,
        anchor_map_ref=None,
        coordinate_system=CANONICAL_COORDINATE_SYSTEM,
        unit=CANONICAL_UNIT,
        scalp_anchor_version=None,
        polygon_count=None,
        lods=[],
        generation_cost_fcfa=180,
        provider_metadata={"provider_task_id": "manual-test"},
        validation_report={},
        status="draft",
        created_at=NOW,
        updated_at=NOW,
    )


def raw_mesh_bytes() -> bytes:
    mesh = trimesh.creation.icosphere(subdivisions=2, radius=10.0)
    payload = mesh.export(file_type="glb")
    assert isinstance(payload, bytes)
    return payload


def normalization_request(raw_ref: StoredAssetRef) -> HairAssetNormalizationRequest:
    return HairAssetNormalizationRequest(
        style_id=STYLE_ID,
        version=VERSION,
        provider="manual",
        raw_ref=raw_ref,
        raw_glb_bytes=raw_mesh_bytes(),
        source_coordinate_system="Z_UP_RIGHT_HANDED",
        source_unit="centimeter",
        source_forward_axis="+Y",
        source_scale=1.0,
        source_reference_span=20.0,
        provider_metadata={"fixture": "story-8.3"},
    )


def assert_real_normalization_pipeline() -> None:
    raw_ref = raw_hair_asset_ref(STYLE_ID, VERSION, "source.glb")
    storage = MemoryAssetStorage()
    repository = MemoryHairAssetRepository(draft_record(raw_ref))
    normalizer = HairAssetNormalizer(
        storage=storage,
        repository=repository,
        policy=HairAssetNormalizationPolicy(
            max_polygons=1_000,
            lod_ratios=(0.5, 0.25),
            min_lod_polygons=20,
            preview_size=128,
        ),
    )

    result = normalizer.normalize(normalization_request(raw_ref))
    assert result.record.status == "validated"
    assert result.record.coordinate_system == CANONICAL_COORDINATE_SYSTEM
    assert result.record.unit == CANONICAL_UNIT
    assert result.record.scalp_anchor_version == SCALP_ANCHOR_VERSION
    assert result.record.polygon_count == 320
    assert result.canonical_ref.path == "canonical/styles/afro-1/v1/hair.glb"
    assert result.preview_ref.path == "canonical/styles/afro-1/v1/preview.webp"
    assert result.anchor_map_ref.path == "canonical/styles/afro-1/v1/anchors.json"
    assert [ref.path for ref in result.lod_refs] == [
        "canonical/styles/afro-1/v1/lod-1.glb",
        "canonical/styles/afro-1/v1/lod-2.glb",
    ]

    canonical_bytes, canonical_type = storage.objects[result.canonical_ref]
    assert canonical_type == "model/gltf-binary"
    decoded = trimesh.load(
        file_obj=BytesIO(canonical_bytes),
        file_type="glb",
        force="scene",
        process=False,
    )
    canonical_mesh = decoded.to_geometry() if hasattr(decoded, "to_geometry") else decoded.dump(concatenate=True)
    assert len(canonical_mesh.faces) == 320
    assert abs(float(canonical_mesh.bounds[0, 1])) < 1e-6
    assert max(float(v) for v in canonical_mesh.extents) < 0.181

    preview_bytes, preview_type = storage.objects[result.preview_ref]
    assert preview_type == "image/webp"
    assert preview_bytes.startswith(b"RIFF") and b"WEBP" in preview_bytes[:16]

    anchor_bytes, anchor_type = storage.objects[result.anchor_map_ref]
    assert anchor_type == "application/json"
    anchors = json.loads(anchor_bytes)
    assert anchors["scalp_anchor_version"] == SCALP_ANCHOR_VERSION
    assert anchors["coordinate_system"] == CANONICAL_COORDINATE_SYSTEM
    assert anchors["unit"] == CANONICAL_UNIT
    assert set(anchors["anchors"]) == {
        "crown",
        "front_center",
        "back_center",
        "left_temple",
        "right_temple",
        "front_left",
        "front_right",
    }

    report = result.validation_report
    assert report["valid"] is True
    assert report["policy_version"] == HAIR_NORMALIZATION_POLICY_VERSION
    assert report["transform"]["source_unit_to_meters"] == 0.01
    assert round(report["transform"]["reference_scale"], 6) == 0.9
    assert report["polygon_budget"]["passed"] is True
    assert [lod["polygon_count"] for lod in report["lods"]] == [160, 80]
    assert repository.persist_calls[-1]["validation_report"]["valid"] is True
    print("[PASS] orientation/unit/reference-scale -> canonical GLB + preview + anchors + LODs + validated metadata")


def assert_polygon_budget_is_fail_closed_and_audited() -> None:
    raw_ref = raw_hair_asset_ref(STYLE_ID, VERSION, "source.glb")
    storage = MemoryAssetStorage()
    repository = MemoryHairAssetRepository(draft_record(raw_ref))
    normalizer = HairAssetNormalizer(
        storage=storage,
        repository=repository,
        policy=HairAssetNormalizationPolicy(
            max_polygons=100,
            lod_ratios=(0.5,),
            min_lod_polygons=20,
            preview_size=128,
        ),
    )

    try:
        normalizer.normalize(normalization_request(raw_ref))
    except HairAssetNormalizationError as exc:
        assert exc.code == "polygon_budget_exceeded"
        assert exc.validation_report["valid"] is False
        assert exc.validation_report["errors"][0]["code"] == "polygon_budget_exceeded"
    else:
        raise AssertionError("Over-budget hair mesh incorrectly became canonical")

    assert repository.record.status == "draft"
    assert len(repository.failure_reports) == 1
    assert repository.failure_reports[0]["errors"][0]["code"] == "polygon_budget_exceeded"
    assert storage.objects == {}
    assert repository.persist_calls == []
    print("[PASS] polygon budget failure stays draft, writes an audit report and publishes no canonical object")


def assert_provenance_and_status_guards() -> None:
    raw_ref = raw_hair_asset_ref(STYLE_ID, VERSION, "source.glb")
    wrong_ref = raw_hair_asset_ref(STYLE_ID, VERSION, "other.glb")
    storage = MemoryAssetStorage()
    repository = MemoryHairAssetRepository(draft_record(raw_ref))
    normalizer = HairAssetNormalizer(storage=storage, repository=repository)

    try:
        normalizer.normalize(replace(normalization_request(raw_ref), raw_ref=wrong_ref))
    except HairAssetNormalizationError as exc:
        assert exc.code == "raw_asset_provenance_mismatch"
    else:
        raise AssertionError("Normalizer accepted a raw asset different from persisted provenance")
    assert repository.failure_reports == []

    repository.record = replace(repository.record, status="published")
    try:
        normalizer.normalize(normalization_request(raw_ref))
    except HairAssetNormalizationError as exc:
        assert exc.code == "hair_asset_version_not_draft"
    else:
        raise AssertionError("Normalizer mutated a non-draft catalog version")
    print("[PASS] raw provenance mismatch and immutable lifecycle states are rejected before storage writes")


def repository_payload(status: str = "draft") -> dict[str, Any]:
    return {
        "id": str(ASSET_ID),
        "style_id": STYLE_ID,
        "version": VERSION,
        "provider": "manual",
        "source_job_id": None,
        "raw_bucket": "hair-assets",
        "raw_path": "raw/styles/afro-1/v1/source.glb",
        "canonical_bucket": "hair-assets" if status == "validated" else None,
        "canonical_path": "canonical/styles/afro-1/v1/hair.glb" if status == "validated" else None,
        "preview_bucket": "hair-assets" if status == "validated" else None,
        "preview_path": "canonical/styles/afro-1/v1/preview.webp" if status == "validated" else None,
        "anchor_map_bucket": "hair-assets" if status == "validated" else None,
        "anchor_map_path": "canonical/styles/afro-1/v1/anchors.json" if status == "validated" else None,
        "coordinate_system": CANONICAL_COORDINATE_SYSTEM,
        "unit": CANONICAL_UNIT,
        "scalp_anchor_version": SCALP_ANCHOR_VERSION if status == "validated" else None,
        "polygon_count": 320 if status == "validated" else None,
        "lods": [],
        "generation_cost_fcfa": 180,
        "provider_metadata": {},
        "validation_report": {"valid": status == "validated"},
        "status": status,
        "created_at": NOW.isoformat(),
        "updated_at": NOW.isoformat(),
    }


class FakeResponse:
    def __init__(self, payload: Any, status_code: int = 200) -> None:
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload)

    def json(self) -> Any:
        return self._payload


class FakeSession:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self.responses: list[FakeResponse] = []

    def push(self, payload: Any, status_code: int = 200) -> None:
        self.responses.append(FakeResponse(payload, status_code))

    def request(self, method: str, url: str, **kwargs: Any) -> FakeResponse:
        self.calls.append({"method": method, "url": url, **kwargs})
        if not self.responses:
            raise AssertionError("FakeSession has no queued response")
        return self.responses.pop(0)


def assert_repository_mapping() -> None:
    session = FakeSession()
    repository = SupabaseHairAssetVersionRepository(
        "https://project.supabase.co",
        "service-role-test-key",
        session=session,
    )

    session.push([repository_payload("draft")])
    record = repository.get_version(STYLE_ID, VERSION)
    assert record is not None and record.status == "draft"
    lookup = session.calls[-1]
    assert lookup["method"] == "GET"
    assert lookup["url"].endswith("/rest/v1/hair_asset_versions")
    assert lookup["params"]["style_id"] == "eq.afro-1"
    assert lookup["params"]["version"] == "eq.1"

    session.push([repository_payload("validated")])
    persisted = repository.persist_normalization(
        style_id=STYLE_ID,
        version=VERSION,
        provider="manual",
        raw_ref=raw_hair_asset_ref(STYLE_ID, VERSION, "source.glb"),
        canonical_ref=canonical_hair_asset_ref(STYLE_ID, VERSION, "hair.glb"),
        preview_ref=canonical_hair_asset_ref(STYLE_ID, VERSION, "preview.webp"),
        anchor_map_ref=canonical_hair_asset_ref(STYLE_ID, VERSION, "anchors.json"),
        scalp_anchor_version=SCALP_ANCHOR_VERSION,
        polygon_count=320,
        lods=[],
        provider_metadata={"normalization": {"policy_version": HAIR_NORMALIZATION_POLICY_VERSION}},
        validation_report={"valid": True},
    )
    assert persisted.status == "validated"
    rpc = session.calls[-1]
    assert rpc["url"].endswith("/rest/v1/rpc/persist_hair_asset_normalization")
    assert rpc["json"]["p_raw_path"] == "raw/styles/afro-1/v1/source.glb"
    assert rpc["json"]["p_canonical_path"] == "canonical/styles/afro-1/v1/hair.glb"
    assert rpc["json"]["p_polygon_count"] == 320

    session.push([repository_payload("draft")])
    repository.record_validation_failure(
        style_id=STYLE_ID,
        version=VERSION,
        validation_report={"valid": False, "errors": [{"code": "test"}]},
    )
    failure_rpc = session.calls[-1]
    assert failure_rpc["url"].endswith("/rest/v1/rpc/record_hair_asset_normalization_failure")
    assert failure_rpc["json"]["p_validation_report"]["valid"] is False
    print("[PASS] Supabase repository maps draft lookup, validated commit and failure audit RPCs")


def assert_sql_and_storage_contracts() -> None:
    migration = (
        REPO_ROOT / "web" / "supabase" / "migrations" / "11_hair_asset_normalization.sql"
    ).read_text(encoding="utf-8")
    required = [
        "CREATE OR REPLACE FUNCTION persist_hair_asset_normalization",
        "FOR UPDATE",
        "target.status <> 'draft'",
        "hair_asset_version_must_be_draft_for_normalization",
        "hair_asset_normalization_provider_provenance_mismatch",
        "hair_asset_normalization_raw_provenance_mismatch",
        "coordinate_system = 'Y_UP_RIGHT_HANDED'",
        "unit = 'meter'",
        "status = 'validated'",
        "CREATE OR REPLACE FUNCTION record_hair_asset_normalization_failure",
        "hair_asset_version_failure_audit_requires_draft",
        "TO service_role",
    ]
    missing = [fragment for fragment in required if fragment not in migration]
    if missing:
        raise AssertionError(f"Story 8.3 migration missing required fragments: {missing}")

    raw = raw_hair_asset_ref("locks-short", 2, "source.glb")
    canonical = canonical_hair_asset_ref("locks-short", 2, "hair.glb")
    assert raw.path == "raw/styles/locks-short/v2/source.glb"
    assert canonical.path == "canonical/styles/locks-short/v2/hair.glb"
    print("[PASS] Python storage builders match Story 8.1 raw/styles and canonical/styles database contracts")


def main() -> None:
    assert_real_normalization_pipeline()
    assert_polygon_budget_is_fail_closed_and_audited()
    assert_provenance_and_status_guards()
    assert_repository_mapping()
    assert_sql_and_storage_contracts()
    print("\nBMAD Story 8.3 HairAssetNormalizer real pipeline: PASS")


if __name__ == "__main__":
    main()
