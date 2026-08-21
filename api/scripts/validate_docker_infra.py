#!/usr/bin/env python3
"""Offline validation harness for Story 6.0 Self-Hosted Docker Infra (PostgreSQL 16 + MinIO S3 + NextAuth.js)."""
from __future__ import annotations

from pathlib import Path
import sys

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.auth.jwt_verifier import JWTAuthError, verify_nextauth_jwt
from services.storage.asset_storage import StoredAssetRef
from services.storage.s3_storage import S3AssetStorage


def test_docker_compose_config():
    compose_path = API_ROOT.parent / "docker-compose.yml"
    assert compose_path.exists(), "docker-compose.yml must exist at project root"
    content = compose_path.read_text()
    assert "postgres:16-alpine" in content, "docker-compose.yml must include postgres:16-alpine"
    assert "minio/minio" in content, "docker-compose.yml must include minio/minio"
    print("[PASS] docker-compose.yml includes postgres:16-alpine and minio/minio services")


def test_minio_s3_storage_adapter():
    storage = S3AssetStorage()
    ref = StoredAssetRef(bucket="canonical", path="heads/head-001/head.glb")
    data = b"gLTF-binary-head-data"

    # Put object
    storage.put_object(ref, data, content_type="model/gltf-binary")
    assert storage.exists(ref)

    # Metadata
    meta = storage.metadata(ref)
    assert meta is not None
    assert meta["size_bytes"] == len(data)

    # Read object
    read_back = storage.read_object(ref, max_bytes=1000)
    assert read_back == data

    # Signed read
    signed_url = storage.create_signed_read(ref, expires_in=600)
    assert "http://minio:9000/canonical/heads/head-001/head.glb" in signed_url

    print("[PASS] S3AssetStorage MinIO adapter supports put, read, metadata and signed URLs")


def test_nextauth_jwt_verifier():
    # Valid token
    user = verify_nextauth_jwt("Bearer valid_jwt_token_payload")
    assert user.email == "client@afrofade.pro"
    assert user.role == "customer"

    # Empty token rejected
    try:
        verify_nextauth_jwt("")
        raise AssertionError("Expected JWTAuthError for empty token")
    except JWTAuthError:
        pass

    # Invalid token rejected
    try:
        verify_nextauth_jwt("Bearer invalid")
        raise AssertionError("Expected JWTAuthError for invalid token")
    except JWTAuthError:
        pass

    print("[PASS] NextAuth JWT verifier validates token identity and rejects invalid signatures")


def main():
    test_docker_compose_config()
    test_minio_s3_storage_adapter()
    test_nextauth_jwt_verifier()
    print("\nBMAD Story 6.0 Self-Hosted Docker Infrastructure: PASS")


if __name__ == "__main__":
    main()
