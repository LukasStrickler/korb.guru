"""Integration tests for /api/v1/users/me (Clerk-authenticated user routes)."""

from collections.abc import AsyncIterator
from typing import cast

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import AuthUser, require_clerk_auth
from src.db import get_db
from src.main import app
from tests.factories import UserFactory

JsonDict = dict[str, object]


def _fake_clerk_auth(user_id: str = "test-clerk-id"):
    """Return a dependency override that returns a fake AuthUser."""

    async def override() -> AuthUser:
        return AuthUser(user_id=user_id, token_sub=user_id)

    return override


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_clerk_auth] = _fake_clerk_auth("test-clerk-id")

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as async_client:
        yield async_client

    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(require_clerk_auth, None)


@pytest.mark.asyncio
class TestMeRoutes:
    async def test_get_me_auto_creates_user(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        """First call to /me auto-creates the user from Clerk identity."""
        _ = db_session

        response = await client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = cast(JsonDict, response.json())
        assert data["clerk_id"] == "test-clerk-id"
        assert isinstance(data["id"], str)  # UUID as string

    async def test_get_me_returns_existing_user(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        """Existing user is returned without creating a new one."""
        UserFactory._meta.sqlalchemy_session = db_session
        user = await UserFactory.create(
            clerk_id="test-clerk-id",
            email="existing@example.com",
            username="existing_user",
        )

        response = await client.get("/api/v1/users/me")

        assert response.status_code == 200
        data = cast(JsonDict, response.json())
        assert data["email"] == "existing@example.com"
        assert data["username"] == "existing_user"
        assert data["id"] == str(user.id)

    async def test_update_profile(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        """PATCH /me updates username and avatar."""
        UserFactory._meta.sqlalchemy_session = db_session
        await UserFactory.create(
            clerk_id="test-clerk-id",
            email="patch@example.com",
            username="old_name",
        )

        response = await client.patch(
            "/api/v1/users/me",
            json={
                "username": "new_name",
                "avatar_url": "https://img.example.com/a.png",
            },
        )

        assert response.status_code == 200
        data = cast(JsonDict, response.json())
        assert data["username"] == "new_name"
        assert data["avatar_url"] == "https://img.example.com/a.png"

    async def test_health_streak(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        """Health streak starts at 0 and can be incremented."""
        UserFactory._meta.sqlalchemy_session = db_session
        await UserFactory.create(clerk_id="test-clerk-id", email="streak@example.com")

        response = await client.get("/api/v1/users/health-streak")
        assert response.status_code == 200
        assert response.json()["health_streak_days"] == 0

        response = await client.post("/api/v1/users/health-streak/increment")
        assert response.status_code == 200
        assert response.json()["health_streak_days"] == 1

    async def test_me_requires_auth(
        self,
        db_session: AsyncSession,
    ) -> None:
        """Without auth override, /me returns 401."""
        _ = db_session

        # Remove auth override to test 401
        app.dependency_overrides.pop(require_clerk_auth, None)

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as unauthenticated_client:
            response = await unauthenticated_client.get("/api/v1/users/me")

        assert response.status_code == 401
