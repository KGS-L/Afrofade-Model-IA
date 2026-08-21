"""FastAPI Auth Guard & Identity Propagation Middleware/Dependency."""
from __future__ import annotations

import os
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from services.auth.jwt_verifier import AuthenticatedUser, JWTAuthError, verify_nextauth_jwt


def get_current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    x_internal_secret: Annotated[str | None, Header(alias="X-Internal-Secret")] = None,
) -> AuthenticatedUser:
    """
    FastAPI dependency that decodes NextAuth.js JWT token from Authorization header
    or validates X-Internal-Secret for system webhooks.
    """
    expected_internal_secret = os.getenv("API_INTERNAL_SECRET", "afrofade_dev_internal_secret")

    # Check internal webhook bypass first
    if x_internal_secret is not None:
        if x_internal_secret == expected_internal_secret:
            return AuthenticatedUser(
                user_id="system_internal",
                email="system@afrofade.pro",
                role="system",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid internal system secret.",
        )

    # Check JWT authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing or malformed Authorization Bearer header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split("Bearer ", 1)[1].strip()

    try:
        user = verify_nextauth_jwt(token)
        return user
    except JWTAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unauthorized: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
