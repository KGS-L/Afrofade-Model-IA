#!/usr/bin/env python3
"""Provider-independent contract validation for BMAD Story 8.1."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import sys

from pydantic import ValidationError

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from models.canonical_assets import CanonicalHairAsset

MIGRATION = REPO_ROOT / "web" / "supabase" / "migrations" / "10_hair_asset_versions.sql"


def require_fragments(source: str, fragments: list[str], label: str) -> None:
    missing = [fragment for fragment in fragments if fragment not in source]
    if missing:
        raise AssertionError(f"{label} missing required contract fragments: {missing}")


def assert_schema_contract() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    require_fragments(
        sql,
        [
            "CREATE TABLE IF NOT EXISTS hair_asset_versions",
            "style_id VARCHAR(100) NOT NULL REFERENCES hairstyles_catalog(id) ON DELETE RESTRICT",
            "version INT NOT NULL CHECK (version >= 1)",
            "provider IN ('trellis2', 'hunyuan_multiview', 'meshy', 'manual')",
            "source_job_id UUID REFERENCES ai_jobs(id) ON DELETE SET NULL",
            "raw_bucket VARCHAR(100) NOT NULL DEFAULT 'hair-assets'",
            "raw_path TEXT NOT NULL",
            "canonical_bucket VARCHAR(100) CHECK",
            "canonical_path TEXT",
            "preview_path TEXT",
            "anchor_map_path TEXT",
            "scalp_anchor_version VARCHAR(100)",
            "polygon_count INT CHECK (polygon_count IS NULL OR polygon_count >= 0)",
            "generation_cost_fcfa INT",
            "status IN ('draft', 'validated', 'published', 'retired')",
            "UNIQUE (style_id, version)",
        ],
        "hair asset version schema",
    )
    print("[PASS] hair_asset_versions stores style/version/provider/raw/canonical/anchors/polycount/cost/status")


def assert_raw_only_draft_contract() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    require_fragments(
        sql,
        [
            "CONSTRAINT hair_asset_versions_canonical_ref_complete CHECK",
            "CONSTRAINT hair_asset_versions_preview_ref_complete CHECK",
            "CONSTRAINT hair_asset_versions_anchor_ref_complete CHECK",
            "CONSTRAINT hair_asset_versions_validated_payload_complete CHECK",
            "status NOT IN ('validated', 'published') OR (",
            "canonical_path IS NOT NULL",
            "preview_path IS NOT NULL",
            "anchor_map_path IS NOT NULL",
            "scalp_anchor_version IS NOT NULL",
            "polygon_count IS NOT NULL",
        ],
        "raw-only draft/normalization gate",
    )
    if "canonical_path TEXT NOT NULL" in sql or "polygon_count INT NOT NULL" in sql:
        raise AssertionError("Draft hair asset versions must be able to persist raw provider output before normalization")
    print("[PASS] drafts may be raw-only; validated/published versions require complete canonical output")


def assert_storage_path_contract() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    require_fragments(
        sql,
        [
            "raw/styles/' || style_id || '/v' || version::TEXT",
            "canonical/styles/' || style_id || '/v' || version::TEXT",
            "position('//' IN raw_path) = 0",
            "position(chr(92) IN raw_path) = 0",
            "position('/../' IN '/' || raw_path || '/') = 0",
            "position('/./' IN '/' || raw_path || '/') = 0",
            "canonical_path IS NULL OR (",
            "position('//' IN canonical_path) = 0",
            "position(chr(92) IN canonical_path) = 0",
        ],
        "versioned storage paths",
    )
    print("[PASS] raw/canonical paths are deterministic per style+version and traversal-safe")


def assert_single_published_resolver() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    require_fragments(
        sql,
        [
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_hair_asset_versions_one_published_per_style",
            "ON hair_asset_versions(style_id)",
            "WHERE status = 'published'",
            "CREATE OR REPLACE FUNCTION resolve_published_hair_asset",
            "WHERE style_id = p_style_id",
            "AND status = 'published'",
            "LIMIT 1",
        ],
        "published version resolution",
    )
    print("[PASS] database guarantees/resolves at most one published version per style")


def assert_publish_retires_previous() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    require_fragments(
        sql,
        [
            "CREATE OR REPLACE FUNCTION publish_hair_asset_version",
            "FOR UPDATE",
            "target.status <> 'validated'",
            "hair_asset_version_must_be_validated_before_publish",
            "SET status = 'retired'",
            "AND status = 'published'",
            "SET status = 'published'",
            "GRANT EXECUTE ON FUNCTION publish_hair_asset_version(VARCHAR, INT) TO service_role",
        ],
        "atomic publish lifecycle",
    )
    print("[PASS] publishing is service-role atomic and retires the previous published version")


def assert_retired_versions_are_auditable_and_immutable() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    require_fragments(
        sql,
        [
            "retired_hair_asset_version_is_immutable",
            "published_hair_asset_version_payload_is_immutable",
            "published_hair_asset_version_invalid_transition",
            "NEW.retired_at IS DISTINCT FROM OLD.retired_at",
            "retired_at TIMESTAMPTZ",
            "hair_asset_versions_admin_select_all",
            "profile.role = 'admin'",
            "REVOKE INSERT, UPDATE, DELETE ON hair_asset_versions FROM authenticated",
        ],
        "audit/immutability contract",
    )
    if "DELETE FROM hair_asset_versions" in sql:
        raise AssertionError("Publishing/retirement must not delete historical hair asset versions")
    print("[PASS] retired versions remain stored, admin-auditable and immutable")


def assert_public_only_sees_published() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    require_fragments(
        sql,
        [
            "ALTER TABLE hair_asset_versions ENABLE ROW LEVEL SECURITY",
            "CREATE POLICY hair_asset_versions_select_published",
            "USING (status = 'published')",
            "GRANT SELECT ON hair_asset_versions TO anon, authenticated",
        ],
        "RLS contract",
    )
    print("[PASS] catalog consumers can only select published versions; admin can audit history")


def canonical_payload(provider: str) -> dict[str, object]:
    return {
        "id": "hair-version-1",
        "styleId": "afro-1",
        "version": 1,
        "provider": provider,
        "sourceJobId": None,
        "meshUrl": "https://assets.afrofade.pro/hair-assets/canonical/styles/afro-1/v1/hair.glb",
        "previewUrl": "https://assets.afrofade.pro/hair-assets/canonical/styles/afro-1/v1/preview.webp",
        "coordinateSystem": "Y_UP_RIGHT_HANDED",
        "unit": "meter",
        "scalpAnchorVersion": "afrofade-hair-anchors-v1",
        "anchorMapUrl": "https://assets.afrofade.pro/hair-assets/canonical/styles/afro-1/v1/anchors.json",
        "polygonCount": 25000,
        "lods": [],
        "generationCostFcfa": 180,
        "status": "validated",
        "createdAt": datetime.now(UTC).isoformat(),
    }


def assert_provider_contract_includes_experimental_meshy() -> None:
    for provider in ("trellis2", "hunyuan_multiview", "meshy", "manual"):
        model = CanonicalHairAsset.model_validate(canonical_payload(provider))
        assert model.provider == provider

    try:
        CanonicalHairAsset.model_validate(canonical_payload("unknown_provider"))
    except ValidationError:
        pass
    else:
        raise AssertionError("CanonicalHairAsset accepted an unknown provider")

    print("[PASS] CanonicalHairAsset accepts TRELLIS/Hunyuan/Meshy/manual and rejects unknown providers")


def main() -> None:
    assert_schema_contract()
    assert_raw_only_draft_contract()
    assert_storage_path_contract()
    assert_single_published_resolver()
    assert_publish_retires_previous()
    assert_retired_versions_are_auditable_and_immutable()
    assert_public_only_sees_published()
    assert_provider_contract_includes_experimental_meshy()
    print("\nBMAD Story 8.1 hair asset versioning contract: PASS")


if __name__ == "__main__":
    main()
