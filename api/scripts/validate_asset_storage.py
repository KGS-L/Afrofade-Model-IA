#!/usr/bin/env python3
"""Provider-independent validation for BMAD Story 7.4 AssetStorage."""

from __future__ import annotations

import os
from pathlib import Path
import sys
from typing import Any

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.storage.asset_storage import AssetStorageError, StoredAssetRef
from services.storage.supabase_storage import SupabaseAssetStorage, validate_asset_ref
import services.storage.supabase_storage as storage_module


class FakeBucket:
    def __init__(self, name: str) -> None:
        self.name = name
        self.calls: list[tuple[str, Any]] = []
        self.listing: list[dict[str, Any]] = []

    def upload(self, *, path: str, file: Any, file_options: dict[str, Any]) -> dict[str, Any]:
        self.calls.append(("upload", {"path": path, "file": file, "file_options": file_options}))
        return {"path": path}

    def remove(self, paths: list[str]) -> dict[str, Any]:
        self.calls.append(("remove", paths))
        return {"data": paths}

    def create_signed_url(self, path: str, expires_in: int) -> dict[str, Any]:
        self.calls.append(("create_signed_url", {"path": path, "expires_in": expires_in}))
        return {"signedURL": f"https://signed.example/{self.name}/{path}?expires={expires_in}"}

    def create_signed_upload_url(self, path: str, options: dict[str, Any] | None = None) -> dict[str, Any]:
        self.calls.append(("create_signed_upload_url", {"path": path, "options": options or {}}))
        return {
            "signedURL": f"https://signed.example/{self.name}/{path}?upload=1",
            "token": "upload-token",
        }

    def list(self, parent: str, options: dict[str, Any]) -> list[dict[str, Any]]:
        self.calls.append(("list", {"parent": parent, "options": options}))
        return self.listing


class FakeStorage:
    def __init__(self) -> None:
        self.buckets: dict[str, FakeBucket] = {}

    def from_(self, name: str) -> FakeBucket:
        return self.buckets.setdefault(name, FakeBucket(name))


class FakeSupabaseClient:
    def __init__(self) -> None:
        self.storage = FakeStorage()


def expect_asset_error(name: str, callback) -> None:
    try:
        callback()
    except AssetStorageError:
        print(f"[PASS] {name}")
        return
    raise AssertionError(f"[FAIL] {name}: expected AssetStorageError")


def assert_path_validation() -> None:
    valid = validate_asset_ref(StoredAssetRef("heads", "canonical/users/u1/head.glb"))
    assert valid.path == "canonical/users/u1/head.glb"

    expect_asset_error(
        "absolute storage path rejected",
        lambda: validate_asset_ref(StoredAssetRef("heads", "/tmp/head.glb")),
    )
    expect_asset_error(
        "path traversal rejected",
        lambda: validate_asset_ref(StoredAssetRef("heads", "canonical/users/u1/../other/head.glb")),
    )
    expect_asset_error(
        "double-slash storage path rejected before normalization",
        lambda: validate_asset_ref(StoredAssetRef("heads", "canonical/users/u1//head.glb")),
    )
    expect_asset_error(
        "dot storage path segment rejected before normalization",
        lambda: validate_asset_ref(StoredAssetRef("heads", "canonical/users/u1/./head.glb")),
    )
    expect_asset_error(
        "backslash path rejected",
        lambda: validate_asset_ref(StoredAssetRef("heads", "users\\u1\\head.glb")),
    )
    expect_asset_error(
        "unsupported bucket rejected",
        lambda: validate_asset_ref(StoredAssetRef("public-random", "head.glb")),
    )
    print("[PASS] valid durable storage reference accepted")


def assert_sdk_mapping() -> None:
    client = FakeSupabaseClient()
    storage = SupabaseAssetStorage(
        "https://project.supabase.co",
        "service-role-test-key",
        client=client,
    )
    asset = StoredAssetRef("heads", "canonical/users/u1/head.glb")

    uploaded = storage.put_object(asset, b"glb-bytes", content_type="model/gltf-binary")
    assert uploaded == asset
    bucket = client.storage.from_("heads")
    assert bucket.calls[-1][0] == "upload"
    assert bucket.calls[-1][1]["file_options"]["content-type"] == "model/gltf-binary"
    print("[PASS] server upload SDK mapping")

    read_url = storage.create_signed_read(asset, expires_in=600)
    assert read_url.startswith("https://signed.example/")
    assert bucket.calls[-1] == (
        "create_signed_url",
        {"path": asset.path, "expires_in": 600},
    )
    print("[PASS] signed read SDK mapping")

    signed_upload = storage.create_signed_upload(asset, upsert=False)
    assert signed_upload.asset == asset
    assert signed_upload.token == "upload-token"
    assert bucket.calls[-1][0] == "create_signed_upload_url"
    assert bucket.calls[-1][1]["path"] == asset.path
    assert bucket.calls[-1][1]["options"]["upsert"] is False

    signed_upload_upsert = storage.create_signed_upload(asset, upsert=True)
    assert signed_upload_upsert.asset == asset
    assert bucket.calls[-1][1]["options"]["upsert"] is True
    print("[PASS] signed upload SDK mapping preserves boolean upsert contract")

    filename = "head.glb"
    bucket.listing = [{"name": filename, "id": "object-1", "metadata": {"mimetype": "model/gltf-binary"}}]
    metadata = storage.metadata(asset)
    assert metadata is not None and metadata["name"] == filename
    assert storage.exists(asset) is True
    print("[PASS] exists/metadata SDK mapping")

    storage.delete_object(asset)
    assert bucket.calls[-1] == ("remove", [asset.path])
    print("[PASS] delete SDK mapping")

    class ReadResponse:
        def __init__(self, chunks): self.chunks=chunks; self.closed=False
        def raise_for_status(self): pass
        def iter_content(self, _): yield from self.chunks
        def close(self): self.closed=True
    original_get=storage_module.requests.get
    try:
        response=ReadResponse([b"abc",b"def"]); storage_module.requests.get=lambda *a,**k:response
        assert storage.read_object(asset,max_bytes=6)==b"abcdef" and response.closed
        response=ReadResponse([b"abcdefg"]); storage_module.requests.get=lambda *a,**k:response
        expect_asset_error("bounded read rejects oversize",lambda:storage.read_object(asset,max_bytes=6)); assert response.closed
        expect_asset_error("bounded read rejects invalid limit",lambda:storage.read_object(asset,max_bytes=0))
        storage_module.requests.get=lambda *a,**k:(_ for _ in ()).throw(storage_module.requests.ConnectionError("offline"))
        expect_asset_error("bounded read maps transport failure",lambda:storage.read_object(asset,max_bytes=6))
    finally: storage_module.requests.get=original_get
    print("[PASS] bounded storage read success and close")


def assert_fail_closed_configuration() -> None:
    old_public_url = os.environ.pop("NEXT_PUBLIC_SUPABASE_URL", None)
    old_server_url = os.environ.pop("SUPABASE_URL", None)
    old_key = os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
    old_env = os.environ.get("FASTAPI_ENV")
    try:
        expect_asset_error("missing AssetStorage credentials fail closed", SupabaseAssetStorage.from_env)

        os.environ["FASTAPI_ENV"] = "production"
        expect_asset_error(
            "cleartext Supabase AssetStorage URL rejected in production",
            lambda: SupabaseAssetStorage(
                "http://project.supabase.local",
                "service-role-test-key",
                client=FakeSupabaseClient(),
            ),
        )
    finally:
        if old_public_url is not None:
            os.environ["NEXT_PUBLIC_SUPABASE_URL"] = old_public_url
        if old_server_url is not None:
            os.environ["SUPABASE_URL"] = old_server_url
        if old_key is not None:
            os.environ["SUPABASE_SERVICE_ROLE_KEY"] = old_key
        if old_env is None:
            os.environ.pop("FASTAPI_ENV", None)
        else:
            os.environ["FASTAPI_ENV"] = old_env


def assert_web_contract() -> None:
    upload_route = (
        REPO_ROOT / "web" / "src" / "app" / "api" / "upload" / "presigned-url" / "route.ts"
    ).read_text(encoding="utf-8")
    storage_client = (REPO_ROOT / "web" / "src" / "lib" / "storage.ts").read_text(encoding="utf-8")
    signed_read_route = (
        REPO_ROOT / "web" / "src" / "app" / "api" / "storage" / "signed-read" / "route.ts"
    ).read_text(encoding="utf-8")

    required = [
        ("upload route returns durable storageRef", "storageRef:" in upload_route),
        ("client uploads through uploadToSignedUrl", "uploadToSignedUrl" in storage_client),
        ("client no longer expects publicUrl", "publicUrl" not in storage_client),
        ("client has no demo upload fallback", "/uploads/demo/" not in storage_client),
        ("signed read verifies principal", "getVerifiedPrincipal" in signed_read_route),
        ("signed read checks ownership", "principalOwnsAsset" in signed_read_route),
        ("signed read uses server Supabase", "getServiceSupabase" in signed_read_route),
    ]
    failed = [name for name, condition in required if not condition]
    if failed:
        raise AssertionError(f"Web storage contract failed: {failed}")
    print("[PASS] web private upload/read contract")


def main() -> None:
    assert_path_validation()
    assert_sdk_mapping()
    assert_fail_closed_configuration()
    assert_web_contract()
    print("\nDurable AssetStorage contract: PASS")


if __name__ == "__main__":
    main()
