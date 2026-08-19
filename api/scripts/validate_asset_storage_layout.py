#!/usr/bin/env python3
"""Static/layout validation for BMAD Story 7.4 durable private storage."""

from __future__ import annotations

from pathlib import Path
import sys
from uuid import UUID

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.storage.paths import (
    canonical_hair_asset_ref,
    canonical_head_ref,
    client_photo_ref,
    raw_hair_asset_ref,
    tryon_export_ref,
)


USER_ID = UUID("11111111-1111-4111-8111-111111111111")
SALON_ID = UUID("22222222-2222-4222-8222-222222222222")


def assert_path_builders() -> None:
    photo = client_photo_ref("capture.jpg", user_id=USER_ID)
    assert photo.bucket == "client-photos"
    assert photo.path == f"temporary/users/{USER_ID}/capture.jpg"

    head = canonical_head_ref("head-001", "head.glb", salon_id=SALON_ID)
    assert head.bucket == "heads"
    assert head.path == f"canonical/salons/{SALON_ID}/head-001/head.glb"

    raw_hair = raw_hair_asset_ref("locks-short", 2, "source.glb")
    assert raw_hair.path == "raw/locks-short/v2/source.glb"

    canonical_hair = canonical_hair_asset_ref("locks-short", 2, "canonical.glb")
    assert canonical_hair.path == "canonical/locks-short/v2/canonical.glb"

    export = tryon_export_ref("export-001", "look.png", user_id=USER_ID)
    assert export.path == f"exports/users/{USER_ID}/export-001/look.png"
    print("[PASS] canonical durable storage path builders")


def assert_bucket_migration() -> None:
    migration = (
        REPO_ROOT / "web" / "supabase" / "migrations" / "07_private_asset_buckets.sql"
    ).read_text(encoding="utf-8")

    for bucket in ("client-photos", "heads", "hair-assets", "tryons"):
        if f"'{bucket}'" not in migration:
            raise AssertionError(f"Missing private bucket migration for {bucket}")

    required = [
        "INSERT INTO storage.buckets",
        "FALSE",
        "10485760",
        "image/jpeg",
        "image/png",
        "image/webp",
        "ON CONFLICT (id) DO UPDATE",
        "SET public = FALSE",
    ]
    missing = [fragment for fragment in required if fragment not in migration]
    if missing:
        raise AssertionError(f"Private bucket migration missing: {missing}")
    if "image/jpg" in migration:
        raise AssertionError("Private bucket must use canonical image/jpeg instead of image/jpg")
    print("[PASS] private asset buckets are provisioned reproducibly with canonical MIME types")


def assert_web_layout() -> None:
    upload_route = (
        REPO_ROOT / "web" / "src" / "app" / "api" / "upload" / "presigned-url" / "route.ts"
    ).read_text(encoding="utf-8")
    storage_client = (
        REPO_ROOT / "web" / "src" / "lib" / "storage.ts"
    ).read_text(encoding="utf-8")
    signed_read_route = (
        REPO_ROOT / "web" / "src" / "app" / "api" / "storage" / "signed-read" / "route.ts"
    ).read_text(encoding="utf-8")

    checks = {
        "temporary photo namespace": "`temporary/${ownerPrefix}/" in upload_route,
        "server normalizes image/jpg to image/jpeg": "mimeType === 'image/jpg' ? 'image/jpeg'" in upload_route,
        "client normalizes image/jpg to image/jpeg": "mimeType === 'image/jpg' ? 'image/jpeg'" in storage_client,
        "client uploads canonical content type": "contentType: uploadContentType" in storage_client,
        "temporary signed-read ownership": "`temporary/${prefix}`" in signed_read_route,
        "canonical head ownership": "`canonical/${prefix}`" in signed_read_route,
        "try-on export ownership": "`exports/${prefix}`" in signed_read_route,
        "hair catalogue not broadly exposed": "principal.role === 'admin'" in signed_read_route,
    }
    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        raise AssertionError(f"Web private storage layout failed: {failed}")
    print("[PASS] web routes enforce bucket-specific owned prefixes and canonical MIME upload")


def main() -> None:
    assert_path_builders()
    assert_bucket_migration()
    assert_web_layout()
    print("\nPrivate AssetStorage layout: PASS")


if __name__ == "__main__":
    main()
