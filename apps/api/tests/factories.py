"""
Factory Boy test fixtures for creating test data.

Uses async_factory_boy for async SQLAlchemy session support.
"""

import factory
from async_factory_boy.factory.sqlalchemy import AsyncSQLAlchemyFactory

from src.models.user import User


class UserFactory(AsyncSQLAlchemyFactory):
    """Factory for creating User instances in tests."""

    class Meta:
        model = User
        # Session is injected by the db_session fixture at test time
        sqlalchemy_session_persistence = "commit"

    id = factory.Sequence(lambda n: n + 1)  # Auto-increment
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Faker("name")
