"""
Authentication for FastAPI: Clerk JWT and ingest API key.

- User routes: require_clerk_auth (Bearer from Clerk).
- Ingest: require_ingest_auth (Bearer or X-Ingest-Secret). See .docs/reference/auth.md.
  Uses constant-time comparison, per-IP exponential backoff, and secure logging.
"""
from __future__ import annotations

import hmac
import logging
import os
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from .analytics import capture_ingest_auth_blocked, capture_ingest_auth_failure
from .ingest_ratelimit import get_ingest_backoff

security = HTTPBearer(auto_error=False)
_logger = logging.getLogger(__name__)

# Optional: comma-separated allowed azp (authorized party) values for production
_CLERK_AZP_ALLOWED_ENV = "CLERK_AZP_ALLOWED"


def _get_ingest_api_key() -> str | None:
    """Server-only; not exposed to client."""
    return os.getenv("INGEST_API_KEY") or None


def _constant_time_equals(provided: str | None, expected: str) -> bool:
    """Compare ingest key in constant time to avoid timing side-channels."""
    a = (provided or "").strip().encode("utf-8")
    b = expected.encode("utf-8")
    return hmac.compare_digest(a, b)


class AuthUser:
    """Minimal user info from verified Clerk JWT."""

    def __init__(self, user_id: str, token_sub: str | None = None):
        self.user_id = user_id
        self.token_sub = token_sub  # Clerk subject (stable user id)


def _get_clerk_jwks_uri() -> str | None:
    """JWKS URI from CLERK_JWT_ISSUER_DOMAIN or CLERK_JWKS_URL."""
    url = os.getenv("CLERK_JWKS_URL") or None
    if url:
        return url
    domain = (os.getenv("CLERK_JWT_ISSUER_DOMAIN") or "").strip()
    if not domain:
        return None
    base = domain.rstrip("/")
    return f"{base}/.well-known/jwks.json"


def _verify_clerk_jwt(token: str) -> AuthUser:
    """Verify Clerk JWT with JWKS (RS256), exp/nbf/iss; optionally validate azp."""
    jwks_uri = _get_clerk_jwks_uri()
    if not jwks_uri:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "JWT verification not configured "
                "(set CLERK_JWT_ISSUER_DOMAIN or CLERK_JWKS_URL)"
            ),
        )
    try:
        client = PyJWKClient(jwks_uri)
        signing_key = client.get_signing_key_from_jwt(token)
        issuer = (os.getenv("CLERK_JWT_ISSUER_DOMAIN") or "").strip().rstrip("/")
        if not issuer and jwks_uri.endswith("/.well-known/jwks.json"):
            issuer = jwks_uri.replace("/.well-known/jwks.json", "")
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"require": ["exp", "nbf", "sub"]},
            issuer=issuer or None,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        _logger.debug("Invalid Clerk JWT: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    sub = payload.get("sub") or ""
    azp_allowed = os.getenv(_CLERK_AZP_ALLOWED_ENV)
    if azp_allowed:
        allowed = [a.strip() for a in azp_allowed.split(",") if a.strip()]
        azp = payload.get("azp")
        if allowed and (not azp or azp not in allowed):
            _logger.debug("azp %r not in allowed list", azp)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience",
                headers={"WWW-Authenticate": "Bearer"},
            )
    return AuthUser(user_id=sub, token_sub=sub)


async def require_clerk_auth(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> AuthUser:
    """
    Require a valid Bearer token and return the authenticated user.

    The mobile app sends the Clerk session token in the Authorization header.
    In production, verify the JWT with Clerk's JWKS (RS256), exp/nbf/iss, and
    optionally azp. Set CLERK_JWT_ISSUER_DOMAIN (Clerk Frontend API URL) or
    CLERK_JWKS_URL. See .docs/reference/auth.md.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header (expected Bearer token)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials

    # Dev: if no JWKS configured, accept any Bearer and return stub user
    if not _get_clerk_jwks_uri():
        return AuthUser(user_id="dev-user", token_sub="placeholder")

    return _verify_clerk_jwt(token)


def _client_ip(request: Request) -> str:
    """Client IP for rate limiting. Prefer X-Forwarded-For if behind trusted proxy."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def require_ingest_auth(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    x_ingest_secret: Annotated[str | None, Header(alias="X-Ingest-Secret")] = None,
) -> None:
    """
    Require ingest auth for POST /ingest. Constant-time compare, per-IP
    exponential backoff on failure, and secure logging (no key/token in logs).
    """
    expected = _get_ingest_api_key()
    token = (credentials and credentials.credentials) or x_ingest_secret
    ip = _client_ip(request)
    backoff = get_ingest_backoff()

    if not expected:
        return  # Dev: no key configured, allow

    blocked, retry_after = await backoff.is_blocked(ip)
    if blocked:
        _logger.warning("ingest_auth_blocked ip=%s retry_after=%s", ip, retry_after)
        capture_ingest_auth_blocked(ip, retry_after)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed ingest attempts. Retry later.",
            headers={"Retry-After": str(retry_after)},
        )

    if not _constant_time_equals(token, expected):
        wait_sec = await backoff.record_failure(ip)
        _logger.warning(
            "ingest_auth_failure client_ip=%s retry_after_sec=%s",
            ip,
            wait_sec,
        )
        capture_ingest_auth_failure(ip, wait_sec)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing ingest credentials.",
            headers={
                "WWW-Authenticate": "Bearer",
                "Retry-After": str(wait_sec),
            },
        )

    await backoff.record_success(ip)
