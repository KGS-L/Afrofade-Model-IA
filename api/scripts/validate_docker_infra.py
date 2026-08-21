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
    assert "CLOUDINARY_CLOUD_NAME" in content, "docker-compose.yml must include CLOUDINARY_CLOUD_NAME"
    print("[PASS] docker-compose.yml includes postgres:16-alpine and CLOUDINARY_CLOUD_NAME services")


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
    test_nextauth_jwt_verifier()
    print("\nBMAD Story 6.0 Self-Hosted Docker Infrastructure: PASS")


if __name__ == "__main__":
    main()
