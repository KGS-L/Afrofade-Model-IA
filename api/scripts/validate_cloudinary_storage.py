#!/usr/bin/env python3
"""Offline validation harness for Cloudinary AssetStorage integration."""
from __future__ import annotations

from pathlib import Path
import sys

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.storage.asset_storage import StoredAssetRef
from services.storage.cloudinary_storage import CloudinaryAssetStorage


def test_cloudinary_asset_storage():
    storage = CloudinaryAssetStorage(cloud_name="afrofade-test-cloud")
    ref = StoredAssetRef(bucket="canonical", path="styles/afro-taper-fade/hair.glb")
    data = b"GLTF-3d-hair-model-data"

    # Put object
    storage.put_object(ref, data, content_type="model/gltf-binary")
    assert storage.exists(ref)

    # Metadata
    meta = storage.metadata(ref)
    assert meta is not None
    assert meta["cloud_name"] == "afrofade-test-cloud"
    assert meta["public_id"] == "afrofade/canonical/styles/afro-taper-fade/hair.glb"

    # Read object
    read_back = storage.read_object(ref, max_bytes=2048)
    assert read_back == data

    # Signed read URL
    read_url = storage.create_signed_read(ref, expires_in=3600)
    assert "https://res.cloudinary.com/afrofade-test-cloud/raw/upload/" in read_url
    assert "afrofade/canonical/styles/afro-taper-fade/hair.glb" in read_url

    # Signed upload URL
    signed_upload = storage.create_signed_upload(ref)
    assert "https://api.cloudinary.com/v1_1/afrofade-test-cloud/auto/upload" in signed_upload.signed_url

    # Delete
    storage.delete_object(ref)
    assert not storage.exists(ref)

    print("[PASS] CloudinaryAssetStorage supports put, read, signed URLs, public_id generation, and deletion")


def main():
    test_cloudinary_asset_storage()
    print("\nBMAD Cloudinary AssetStorage Integration: PASS")


if __name__ == "__main__":
    main()
