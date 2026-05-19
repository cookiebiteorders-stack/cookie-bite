import secrets
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from core.config import get_settings

security = HTTPBearer(auto_error=False)
_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient | None:
    global _jwk_client
    settings = get_settings()
    if not settings.clerk_jwks_url.strip():
        return None
    if _jwk_client is None:
        _jwk_client = PyJWKClient(settings.clerk_jwks_url)
    return _jwk_client


def verify_internal_secret(
    x_internal_secret: str | None = Header(default=None, alias="x-internal-secret"),
) -> bool:
    """Matches Next.js `lib/auth/verify-internal.ts`."""
    settings = get_settings()
    expected = settings.internal_api_secret
    received = x_internal_secret or ""
    if not expected or not received:
        return False
    return secrets.compare_digest(received, expected)


async def require_internal(
    x_internal_secret: str | None = Header(default=None, alias="x-internal-secret"),
) -> None:
    if not verify_internal_secret(x_internal_secret):
        raise HTTPException(status_code=403, detail="Forbidden")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")

    client = _get_jwk_client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Clerk JWKS not configured (set CLERK_JWKS_URL)",
        )

    token = credentials.credentials
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


async def require_internal_or_user(
    x_internal_secret: str | None = Header(default=None, alias="x-internal-secret"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any] | None:
    if verify_internal_secret(x_internal_secret):
        return None
    return await get_current_user(credentials)
