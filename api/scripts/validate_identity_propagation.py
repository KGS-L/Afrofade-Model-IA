#!/usr/bin/env python3
"""Offline validation harness for Story 6.1 User Identity Propagation & FastAPI Guard."""
from __future__ import annotations

from pathlib import Path
import sys

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from fastapi import HTTPException
from middleware.auth_guard import get_current_user
from services.auth.jwt_verifier import AuthenticatedUser, JWTAuthError, verify_nextauth_jwt


class MockRequest:
    pass


def test_valid_nextauth_jwt_propagation():
    req = MockRequest()
    auth_header = "Bearer valid_nextauth_jwt_payload_123"

    user = get_current_user(req, authorization=auth_header)
    assert isinstance(user, AuthenticatedUser)
    assert user.email == "client@afrofade.pro"
    assert user.role == "customer"
    print("[PASS] Valid NextAuth JWT propagates AuthenticatedUser identity correctly")


def test_missing_or_invalid_jwt_rejection():
    req = MockRequest()

    # Missing authorization header
    try:
        get_current_user(req, authorization=None)
        raise AssertionError("Expected 401 HTTPException for missing header")
    except HTTPException as exc:
        assert exc.status_code == 401

    # Malformed header
    try:
        get_current_user(req, authorization="Basic token123")
        raise AssertionError("Expected 401 HTTPException for non-Bearer header")
    except HTTPException as exc:
        assert exc.status_code == 401

    # Invalid token
    try:
        get_current_user(req, authorization="Bearer invalid")
        raise AssertionError("Expected 401 HTTPException for invalid token")
    except HTTPException as exc:
        assert exc.status_code == 401

    print("[PASS] Missing, malformed or invalid JWTs trigger immediate HTTP 401 Unauthorized")


def test_internal_system_webhook_bypass():
    req = MockRequest()
    secret = "afrofade_dev_internal_secret"

    # Valid internal secret
    system_user = get_current_user(req, x_internal_secret=secret)
    assert system_user.user_id == "system_internal"
    assert system_user.role == "system"

    # Invalid internal secret
    try:
        get_current_user(req, x_internal_secret="wrong_secret")
        raise AssertionError("Expected 403 HTTPException for wrong secret")
    except HTTPException as exc:
        assert exc.status_code == 403

    print("[PASS] Internal webhooks bypass JWT via X-Internal-Secret with 403 protection on mismatch")


def main():
    test_valid_nextauth_jwt_propagation()
    test_missing_or_invalid_jwt_rejection()
    test_internal_system_webhook_bypass()
    print("\nBMAD Story 6.1 Identity Propagation & FastAPI Guard: PASS")


if __name__ == "__main__":
    main()
