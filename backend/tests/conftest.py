"""Shared test fixtures: in-memory DB, mock Qdrant, auth helpers."""
import os

# Set test environment BEFORE importing any app modules
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("TESTING", "1")

import random
import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from qdrant_client import QdrantClient, models
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

from app.database import get_session
from app.models.user import User
from app.models.household import Household
from app.models.recipe import Recipe, RecipeIngredient, SwipeAction
from app.qdrant.collections import VECTOR_SIZE
from app.services.auth_service import hash_password, create_access_token

# ---------------------------------------------------------------------------
# In-memory SQLite engine for test isolation
# StaticPool ensures all connections share the same in-memory database.
# ---------------------------------------------------------------------------
TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)


def _test_session():
    with Session(TEST_ENGINE) as session:
        yield session


# ---------------------------------------------------------------------------
# Deterministic fake embeddings (no fastembed / GPU required)
# ---------------------------------------------------------------------------
def _fake_embed_text(text: str) -> list[float]:
    rng = random.Random(hash(text))
    return [rng.uniform(-1, 1) for _ in range(VECTOR_SIZE)]


def _fake_embed_texts(texts: list[str]) -> list[list[float]]:
    return [_fake_embed_text(t) for t in texts]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _setup_db():
    """Create all tables before each test, drop after."""
    SQLModel.metadata.create_all(TEST_ENGINE)
    yield
    SQLModel.metadata.drop_all(TEST_ENGINE)


@pytest.fixture(autouse=True)
def _mock_embeddings():
    """Replace embedding service with deterministic fake vectors."""
    with patch("app.services.embedding_service.embed_text", side_effect=_fake_embed_text), \
         patch("app.services.embedding_service.embed_texts", side_effect=_fake_embed_texts):
        yield


@pytest.fixture()
def qdrant_memory():
    """In-memory Qdrant client with all collections pre-created."""
    client = QdrantClient(":memory:")

    # Products — hybrid search with named vectors
    client.create_collection(
        "products",
        vectors_config={
            "dense": models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        },
        sparse_vectors_config={
            "sparse": models.SparseVectorParams(modifier=models.Modifier.IDF),
        },
    )

    # Recipes — semantic search
    client.create_collection(
        "recipes",
        vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
    )

    # User preferences — Discovery API
    client.create_collection(
        "user_preferences",
        vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
    )

    return client


@pytest.fixture(autouse=True)
def _mock_qdrant(qdrant_memory):
    """Replace Qdrant singleton with in-memory client."""
    with patch("app.qdrant.client._client", qdrant_memory):
        yield


@pytest.fixture(autouse=True)
def _patch_lifespan():
    """Prevent lifespan from connecting to real PostgreSQL / Qdrant."""
    with patch("app.database.create_db_and_tables"), \
         patch("app.qdrant.collections.init_collections"):
        yield


@pytest.fixture()
def session():
    """Direct DB session for test data setup."""
    with Session(TEST_ENGINE) as s:
        yield s


@pytest.fixture()
def client():
    """Unauthenticated TestClient."""
    from app.main import app
    app.dependency_overrides[get_session] = _test_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def test_user(session: Session) -> User:
    user = User(
        email="test@korb.guru",
        username="testuser",
        hashed_password=hash_password("TestPass1"),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture()
def auth_token(test_user: User) -> str:
    return create_access_token({"sub": str(test_user.id)})


@pytest.fixture()
def auth_client(client: TestClient, auth_token: str) -> TestClient:
    """Authenticated TestClient."""
    client.headers["Authorization"] = f"Bearer {auth_token}"
    return client


@pytest.fixture()
def test_user_2(session: Session) -> User:
    user = User(
        email="user2@korb.guru",
        username="user2",
        hashed_password=hash_password("TestPass2"),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture()
def test_household(session: Session, test_user: User) -> Household:
    """Create a household and assign test_user to it."""
    household = Household(
        name="Test WG",
        invite_code="test-invite-123",
        created_by=test_user.id,
    )
    session.add(household)
    session.commit()
    session.refresh(household)
    test_user.household_id = household.id
    session.add(test_user)
    session.commit()
    session.refresh(test_user)
    return household
