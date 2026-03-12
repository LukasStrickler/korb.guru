"""Regression tests for Clerk JWT verification."""

from __future__ import annotations

from types import SimpleNamespace

import jwt
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from src.auth import _verify_clerk_jwt
from src.main import app


def test_verify_clerk_jwt_disables_audience_validation_for_session_tokens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Clerk session tokens may include aud and should still verify by default."""
    monkeypatch.delenv("CLERK_JWT_ISSUER_DOMAIN", raising=False)
    monkeypatch.delenv("CLERK_AZP_ALLOWED", raising=False)
    monkeypatch.setenv(
        "CLERK_FRONTEND_API_URL",
        "https://regular-wahoo-99.clerk.accounts.dev",
    )

    class StubJwkClient:
        def __init__(self, uri: str) -> None:
            self.uri = uri

        def get_signing_key_from_jwt(self, token: str) -> SimpleNamespace:
            assert token == "session-token"
            assert (
                self.uri
                == "https://regular-wahoo-99.clerk.accounts.dev/.well-known/jwks.json"
            )
            return SimpleNamespace(key="signing-key")

    def fake_decode(
        token: str,
        key: str,
        algorithms: list[str],
        options: dict[str, object],
        issuer: list[str] | None,
    ) -> dict[str, str]:
        assert token == "session-token"
        assert key == "signing-key"
        assert algorithms == ["RS256"]
        assert options["require"] == ["exp", "nbf", "sub"]
        if options.get("verify_aud") is not False:
            raise jwt.InvalidAudienceError("Invalid audience")
        assert issuer == [
            "https://regular-wahoo-99.clerk.accounts.dev",
            "https://regular-wahoo-99.clerk.accounts.dev/",
        ]
        return {"sub": "user_123", "sid": "sess_123"}

    monkeypatch.setattr("src.auth.PyJWKClient", StubJwkClient)
    monkeypatch.setattr("src.auth.jwt.decode", fake_decode)

    user = _verify_clerk_jwt("session-token")

    assert user.user_id == "user_123"
    assert user.session_id == "sess_123"


def test_verify_clerk_jwt_returns_401_for_invalid_tokens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Invalid JWTs should still map to a 401 response."""
    monkeypatch.delenv("CLERK_JWT_ISSUER_DOMAIN", raising=False)
    monkeypatch.delenv("CLERK_AZP_ALLOWED", raising=False)
    monkeypatch.setenv(
        "CLERK_FRONTEND_API_URL",
        "https://regular-wahoo-99.clerk.accounts.dev",
    )

    class StubJwkClient:
        def __init__(self, uri: str) -> None:
            self.uri = uri

        def get_signing_key_from_jwt(self, token: str) -> SimpleNamespace:
            return SimpleNamespace(key="signing-key")

    def fake_decode(*args: object, **kwargs: object) -> dict[str, str]:
        raise jwt.InvalidTokenError("bad token")

    monkeypatch.setattr("src.auth.PyJWKClient", StubJwkClient)
    monkeypatch.setattr("src.auth.jwt.decode", fake_decode)

    with pytest.raises(HTTPException) as exc_info:
        _verify_clerk_jwt("session-token")

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


@pytest.mark.asyncio
async def test_me_route_accepts_clerk_session_token_without_audience_check(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Protected routes should accept verified Clerk session tokens with aud present."""
    monkeypatch.delenv("CLERK_JWT_ISSUER_DOMAIN", raising=False)
    monkeypatch.delenv("CLERK_AZP_ALLOWED", raising=False)
    monkeypatch.setenv(
        "CLERK_FRONTEND_API_URL",
        "https://regular-wahoo-99.clerk.accounts.dev",
    )

    class StubJwkClient:
        def __init__(self, uri: str) -> None:
            self.uri = uri

        def get_signing_key_from_jwt(self, token: str) -> SimpleNamespace:
            return SimpleNamespace(key="signing-key")

    def fake_decode(
        token: str,
        key: str,
        algorithms: list[str],
        options: dict[str, object],
        issuer: list[str] | None,
    ) -> dict[str, str]:
        assert token == "session-token"
        assert options["verify_aud"] is False
        return {"sub": "user_123", "sid": "sess_123", "aud": "https://korbguru"}

    monkeypatch.setattr("src.auth.PyJWKClient", StubJwkClient)
    monkeypatch.setattr("src.auth.jwt.decode", fake_decode)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get(
            "/me",
            headers={"Authorization": "Bearer session-token"},
        )

    assert response.status_code == 200
    assert response.json()["user_id"] == "user_123"
