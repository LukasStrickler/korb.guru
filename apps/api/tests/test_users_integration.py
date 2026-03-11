from collections.abc import AsyncIterator
from typing import cast

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.main import app

JsonDict = dict[str, object]
JsonList = list[JsonDict]


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as async_client:
        yield async_client

    _ = app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
class TestUserRoutes:
    async def test_list_users_empty(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        _ = db_session

        response = await client.get("/users")

        assert response.status_code == 200
        assert response.json() == []

    async def test_create_user(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        _ = db_session

        response = await client.post(
            "/users",
            json={"email": "test@example.com", "name": "Test User"},
        )

        assert response.status_code == 201
        data = cast(JsonDict, response.json())
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
        assert isinstance(data["id"], int)

    async def test_list_users_after_create(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        _ = db_session

        create_response = await client.post(
            "/users",
            json={"email": "user1@example.com"},
        )

        assert create_response.status_code == 201

        response = await client.get("/users")

        assert response.status_code == 200
        data = cast(JsonList, response.json())
        assert len(data) >= 1
        assert any(user["email"] == "user1@example.com" for user in data)

    async def test_create_duplicate_email(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        _ = db_session

        first_response = await client.post(
            "/users",
            json={"email": "dup@example.com"},
        )

        assert first_response.status_code == 201

        response = await client.post(
            "/users",
            json={"email": "dup@example.com"},
        )

        assert response.status_code == 400
        payload = cast(JsonDict, response.json())
        detail = cast(str, payload["detail"])
        assert isinstance(detail, str)
        assert "already registered" in detail.lower()

    async def test_create_user_returns_client_error_on_duplicate_email_integrity_error(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        rollback_calls = 0

        async def raise_integrity_error() -> None:
            raise IntegrityError(
                "INSERT INTO users (email, name) VALUES (%(email)s, %(name)s)",
                {"email": "race@example.com", "name": None},
                Exception(
                    "duplicate key value violates unique constraint users_email_key"
                ),
            )

        async def track_rollback() -> None:
            nonlocal rollback_calls
            rollback_calls += 1

        monkeypatch.setattr(db_session, "commit", raise_integrity_error)
        monkeypatch.setattr(db_session, "rollback", track_rollback)

        response = await client.post(
            "/users",
            json={"email": "race@example.com"},
        )

        assert response.status_code == 400
        payload = cast(JsonDict, response.json())
        detail = cast(str, payload["detail"])
        assert isinstance(detail, str)
        assert "already registered" in detail.lower()
        assert rollback_calls == 1

    async def test_create_user_without_name(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        _ = db_session

        response = await client.post(
            "/users",
            json={"email": "noname@example.com"},
        )

        assert response.status_code == 201
        data = cast(JsonDict, response.json())
        assert data["email"] == "noname@example.com"
        assert data["name"] is None

    async def test_create_user_validation_error(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        _ = db_session

        response = await client.post(
            "/users",
            json={"name": "Missing Email"},
        )

        assert response.status_code == 422
        payload = cast(JsonDict, response.json())
        detail = cast(JsonList, payload["detail"])
        assert len(detail) == 1
        error = detail[0]
        assert error["loc"] == ["body", "email"]
        assert error["type"] == "missing"
