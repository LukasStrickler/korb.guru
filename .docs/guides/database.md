# Database (Postgres + Qdrant)

**Single source of truth:** root `compose.yml` only (project name `korb-db`). All db commands use this file; there are no per-service compose files.

- **Local dev:** `pnpm db:ready` (up + wait for healthy + migrate; then optionally `pnpm db:seed`), or `pnpm db:up` then `pnpm db:migrate` and seed as needed. Per-service reset (`db:reset:postgres`, `db:reset:qdrant`) stops one service, removes its volume, and brings it back using the same compose.
- **Coolify / production:** Use Coolify one-click Postgres and one-click Qdrant (or any remote). Set `DATABASE_URL` and `QDRANT_URL` on the API; do not deploy this compose. Same env contract everywhere.

**Ready to add something?** New Postgres table -> `apps/api/alembic/versions/` (or `pnpm db:migrate:generate "description"`) then `pnpm db:migrate`. New Postgres seed -> `apps/postgres/seed/`. New Qdrant collection/vectors -> `apps/qdrant/scripts/seed-qdrant.mjs` then `pnpm db:seed:qdrant`. Full command list and where everything lives are below.

## Rationale & best practices

Decisions below are aligned with current practice for central control, DX, and deployment.

| Area                   | Recommendation                                                                                                                   | Our setup                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compose**            | One compose file per purpose; explicit project name for reproducible volume/network names.                                       | Single root `compose.yml` with `name: korb-db`; local dev only.                                                                                                                     |
| **Production DBs**     | Do not run DBs from the same compose as the app in production; use managed/one-click DBs and env vars.                           | Coolify one-click Postgres + Qdrant; API gets `DATABASE_URL`, `QDRANT_URL`.                                                                                                         |
| **Migrations vs seed** | Migrations = schema (DDL). Seed = data (dev/test/reference). Keep them separate; make seeds idempotent where possible.           | Postgres: Alembic in `apps/api/alembic/`; init in `apps/postgres/init/`; seed SQL in `apps/postgres/seed/`. Qdrant: no migrations; state via `apps/qdrant/scripts/seed-qdrant.mjs`. |
| **Central control**    | Single entry point for DB commands (root `package.json`); one place for docs.                                                    | All `db:*` scripts at repo root; this guide is the single reference.                                                                                                                |
| **Alembic**            | Autogenerate from models when possible; date-prefixed revision files; naming convention on metadata for stable constraint names. | `db:migrate:generate`; when the API adds SQLAlchemy `Base`/metadata, set `target_metadata` in `env.py` and add a naming convention for stable autogenerate.                         |
| **Coolify**            | Compose build pack uses one compose file as source of truth; env vars via UI (not `.env` in repo for production).                | This compose is **not** used in Coolify for DBs; only for local. Production: set vars on the API resource.                                                                          |

## Postgres migrations: why Alembic?

We use **Alembic** for Postgres schema migrations. Summary of research and alternatives:

| Tool                   | Pros                                                                                                                                                                                                                                          | Cons                                                                                                    | Adoption                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Alembic**            | De facto standard for Python outside Django; integrates with SQLAlchemy; versioned migrations with upgrade/downgrade; transactional DDL on Postgres; autogenerate from models (~80% of changes); good for team workflows and data migrations. | Autogenerate misses renames and some complex constraints; no built-in checksum validation; ORM-centric. | Very high (SQLAlchemy ecosystem; ~150M+ downloads/month). |
| **Django migrations**  | Built-in, mature, integrated.                                                                                                                                                                                                                 | Tied to Django; not an option for FastAPI.                                                              | Django projects only.                                     |
| **Flyway / Liquibase** | SQL or changelog files; Flyway simple, Liquibase has rollbacks and preconditions.                                                                                                                                                             | JVM ecosystem; Python integration via wrappers (e.g. Pyway for Flyway-style).                           | High in Java; Pyway is smaller Python adoption.           |
| **Atlas**              | Schema-as-code; good for advanced Postgres (ENUMs, RLS, extensions); can integrate with SQLAlchemy.                                                                                                                                           | Different model (declarative state); less common in typical FastAPI setups.                             | Growing; more common in polyglot/DevOps-heavy shops.      |
| **Raw SQL files**      | Full control; no ORM dependency.                                                                                                                                                                                                              | No version chain, no built-in rollback, manual coordination in teams.                                   | Ad hoc.                                                   |

**Recommendation for this project:** **Keep Alembic.** It is the standard choice for FastAPI + Postgres, fits our current hand-written migrations and future SQLAlchemy models, and handles versioning and rollback well. Revisit alternatives only if we need advanced Postgres features (e.g. RLS, complex ENUMs) that Alembic autogenerate doesn't handle well, or a declarative schema-as-code workflow (e.g. Atlas).

## Commands

All use root `compose.yml` (project `korb-db`). **Both** = Postgres + Qdrant; **indi** = that service only.

### Start / stop / ready

| Command                 | What it does                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:up`            | Start both (no wait for healthy).                                                                                                            |
| `pnpm db:up:postgres`   | Start Postgres only                                                                                                                          |
| `pnpm db:up:qdrant`     | Start Qdrant only                                                                                                                            |
| `pnpm db:ready`         | Start both, wait until Postgres and Qdrant are healthy (up to 60s), then run Postgres migrations. Does not seed. Best first run after clone. |
| `pnpm db:down`          | Stop both                                                                                                                                    |
| `pnpm db:down:postgres` | Stop Postgres only                                                                                                                           |
| `pnpm db:down:qdrant`   | Stop Qdrant only                                                                                                                             |

### Migrate (Postgres only; Qdrant has no migrations)

| Command                                  | What it does                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm db:migrate`                        | Apply Postgres migrations (Alembic). **Allowed only when `DATABASE_URL` is local** (localhost, 127.0.0.1, 10.0.2.2); set `ALLOW_DESTRUCTIVE_DB=local` in production one-off jobs. Run after `db:up` or `db:reset`. |
| `pnpm db:migrate:generate [ "message" ]` | Generate new Alembic revision from models. Loads root `.env` so `DATABASE_URL` is set. Default message: `schema_changes`.                                                                                          |

### Seed

| Command                 | What it does                                        |
| ----------------------- | --------------------------------------------------- |
| `pnpm db:seed`          | Seed both (Postgres then Qdrant)                    |
| `pnpm db:seed:postgres` | Load `apps/postgres/seed/example.sql` into Postgres |
| `pnpm db:seed:qdrant`   | Load demo collection + vectors into Qdrant          |

### Reset (wipe volume, start, migrate if Postgres, seed)

| Command                  | What it does                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:reset`          | Wipe both, start both, **wait for Postgres and Qdrant healthy** (poll up to 60s), migrate Postgres, seed both. Prefer this for reliability. |
| `pnpm db:reset:postgres` | Wipe Postgres only, start, short fixed delay, migrate, seed (use full `db:reset` on slow machines if this times out).                       |
| `pnpm db:reset:qdrant`   | Wipe Qdrant only, start, short fixed delay, seed.                                                                                           |

### Logs

| Command                 | What it does         |
| ----------------------- | -------------------- |
| `pnpm db:logs`          | Follow both          |
| `pnpm db:logs:postgres` | Follow Postgres only |
| `pnpm db:logs:qdrant`   | Follow Qdrant only   |

## Where schema, config, and seed live

| Store        | Schema / config                                                                                                                                           | Seed                                                          | How to seed                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| **Postgres** | **Schema:** `apps/api/alembic/` (Alembic migrations — DDL only). **Init:** `apps/postgres/init/` (optional, runs when data dir is empty; no schema here). | `apps/postgres/seed/` (e.g. `example.sql`)                    | `pnpm db:seed:postgres` after `pnpm db:migrate`. |
| **Qdrant**   | **Collection config:** in `apps/qdrant/scripts/seed-qdrant.mjs` (no migrations; collection name, vector size, distance in that script).                   | Same script: points (vectors + payloads) in `seed-qdrant.mjs` | `pnpm db:seed:qdrant`.                           |

Details: [apps/postgres/README.md](../../apps/postgres/README.md), [apps/qdrant/README.md](../../apps/qdrant/README.md).

### Postgres

- **Schema:** Add revisions in `apps/api/alembic/versions/` or run `pnpm db:migrate:generate "description"`; apply with `pnpm db:migrate`. Do not put DDL in `apps/postgres/init/` or in seed files.
- **Seed:** Edit `apps/postgres/seed/example.sql` (or add SQL files and wire in `scripts/db-seed-postgres.mjs`). For dev, `TRUNCATE` + `INSERT` is fine; for production-like reference data prefer idempotent `INSERT ... ON CONFLICT DO UPDATE`.

### Qdrant

- **Config + seed:** One script. Edit `apps/qdrant/scripts/seed-qdrant.mjs` to change collection config (e.g. `vectors.size`, `distance`) or seed points; run `pnpm db:seed:qdrant`.

## Safety (local only)

- **`db:reset`** and **`db:seed:qdrant`** may only run when `DATABASE_URL` and/or `QDRANT_URL` point at local hosts (`localhost`, `127.0.0.1`, `10.0.2.2`). If your env points at production, these commands exit with an error. Override only for local dev: `ALLOW_DESTRUCTIVE_DB=local`.
- **`db:migrate`** is allowed only when `DATABASE_URL` is local. If your env points at a remote host, the command exits with a clear message. **Production:** run migrations in a one-off job that sets `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB=local` (set by the platform, not in repo).
- **Never run `db:reset` or `db:seed` against production.** Use local `.env` with localhost URLs for day-to-day dev.
- **`db:seed:postgres`** always targets the local compose Postgres container (does not use `DATABASE_URL`). It checks Postgres is ready before running; if not, it tells you to run `pnpm db:up` and `pnpm db:migrate` (or `pnpm db:ready`).

## Deployment (Coolify)

- **Do not deploy** root `compose.yml` for databases in production. It is for local development only.
- In Coolify: add **one-click Postgres** and **one-click Qdrant** (or use existing managed instances). Create an **API** resource (e.g. Nixpacks or Dockerfile for `apps/api`).
- **Where to get URLs:** In Coolify, open the one-click Postgres (or Qdrant) service and copy the connection URL from the service details or env tab. Set on the **API** resource: `DATABASE_URL` and `QDRANT_URL` (and `QDRANT_API_KEY` if required). Coolify manages env via the UI; no `.env` in repo for production.
- **Production migrations:** Run Alembic once per release using the same `DATABASE_URL` as the API. In the one-off job, set `ALLOW_DESTRUCTIVE_DB=local` so the migrate guard allows non-local URLs (e.g. Coolify one-off that runs `pnpm db:migrate` or `alembic upgrade head` from `apps/api` with production env). Do not run `db:reset` or `db:seed` against production.
- Same env contract as local: API reads `DATABASE_URL` and `QDRANT_URL` everywhere.

## Runtime Patterns

This section covers SQLAlchemy 2.0 patterns for runtime database access in the FastAPI application.

### SQLAlchemy 2.0 Models

We use SQLAlchemy 2.0 style with `Mapped[]` type annotations and `mapped_column()` for column definitions. This provides:

- Full type checking and IDE autocomplete
- Consistent async attribute access via `AsyncAttrs`
- Deterministic naming conventions for Alembic autogenerate

#### Base Model

All models inherit from `Base` in `apps/api/src/models/base.py`:

```python
from datetime import datetime
from typing import ClassVar

from sqlalchemy import DateTime, MetaData, func
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

class Base(AsyncAttrs, DeclarativeBase):
    """Base class for all SQLAlchemy ORM models.

    Inherits from:
    - AsyncAttrs: Enables async attribute loading
    - DeclarativeBase: SQLAlchemy 2.0 declarative base
    """
    metadata: ClassVar[MetaData] = MetaData(naming_convention=NAMING_CONVENTION)
```

#### Timestamp Mixin

Add `created_at` and `updated_at` to models via `TimestampMixin`:

```python
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
```

#### Example Model

A complete model from `apps/api/src/models/user.py`:

```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

**Key patterns:**

- Use `Mapped[T]` for type annotations
- Use `mapped_column()` for column definitions
- Use `String(length)` instead of raw `str` for database-level constraints
- Use `Mapped[str | None]` for nullable columns
- Always use `DateTime(timezone=True)` for timestamps

### `get_db()` Dependency Pattern

The FastAPI dependency injection pattern for async database sessions lives in `apps/api/src/db.py`.

```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async session without auto-commit.

    Routes control transactions explicitly via session.commit().
    """
    async with get_session_local()() as session:
        yield session
```

**Usage in routes:**

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.models.user import User

router = APIRouter()

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return {"users": users}
```

**Important notes:**

- `get_db()` yields a session without auto-commit
- Routes must call `await db.commit()` to persist changes
- The session is automatically closed when the request ends
- Engine is lazily initialized as a singleton

### Test Fixtures

Tests use an external transaction pattern for isolation. See `apps/api/tests/conftest.py`:

```python
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from testcontainers.postgres import PostgresContainer

from src.models.base import Base

@pytest.fixture(scope="session")
def postgres_container():
    """Start Postgres container for test session."""
    container = PostgresContainer("postgres:16-alpine")
    container.start()
    yield container
    container.stop()

@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def async_engine(postgres_container):
    """Create async engine connected to test container."""
    url = postgres_container.get_connection_url().replace(
        "postgresql+psycopg2://", "postgresql+asyncpg://", 1
    )
    engine = create_async_engine(url, echo=False, poolclass=NullPool)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def create_tables(async_engine):
    """Create all tables once per test session."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@pytest.fixture
async def db_session(async_engine, create_tables):
    """Provide isolated session with automatic rollback.

    Uses external transaction pattern: each test runs in a
    transaction that is rolled back after the test completes.
    """
    async with async_engine.connect() as conn:
        async with conn.begin() as transaction:
            session_factory = async_sessionmaker(
                bind=conn,
                class_=AsyncSession,
                expire_on_commit=False,
                join_transaction_mode="create_savepoint",
            )
            async with session_factory() as session:
                try:
                    yield session
                finally:
                    if transaction.is_active:
                        await transaction.rollback()
```

**Using the fixture in tests:**

```python
@pytest.mark.asyncio
async def test_something(db_session):
    # db_session is an isolated AsyncSession
    result = await db_session.execute(select(User))
    users = result.scalars().all()
    assert len(users) == 0  # Database is clean
```

**Key patterns:**

- `db_session` provides isolation via external transactions
- Each test starts with a clean database state
- Changes are automatically rolled back after each test
- Uses `NullPool` to avoid connection pooling issues in tests

### Factory Pattern

We use `async_factory_boy` for creating test data. Factories live in `apps/api/tests/factories.py`:

```python
import factory
from async_factory_boy.factory.sqlalchemy import AsyncSQLAlchemyFactory

from src.models.user import User

class UserFactory(AsyncSQLAlchemyFactory):
    """Factory for creating User instances in tests."""

    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"

    id = factory.Sequence(lambda n: n + 1)
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Faker("name")
```

**Using factories in tests:**

```python
from tests.factories import UserFactory

@pytest.mark.asyncio
async def test_create_user_with_factory(db_session):
    # Inject session into factory
    UserFactory._meta.sqlalchemy_session = db_session

    user = await UserFactory.create()

    assert user.id is not None
    assert user.email is not None
    assert "@example.com" in user.email
```

**Factory patterns:**

- Inject `db_session` into factory before use: `Factory._meta.sqlalchemy_session = db_session`
- Use `factory.Sequence` for unique fields like email
- Use `factory.Faker` for realistic data like names
- Set `sqlalchemy_session_persistence = "commit"` to auto-commit

## Troubleshooting

### Runtime Issues

| Symptom                                                         | Cause                                                     | Fix                                                                                                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connection refused` or `ECONNREFUSED` (Postgres)               | Postgres not running or not ready yet.                    | Run `pnpm db:up` then wait a few seconds, or use `pnpm db:ready` (waits for healthy).                                                              |
| `relation "example" does not exist` (or other table)            | Migrations not applied.                                   | Run `pnpm db:migrate` (or `pnpm db:ready`).                                                                                                        |
| `role "user" does not exist` / auth errors                      | Wrong credentials or wrong DB.                            | Ensure root `.env` has `DATABASE_URL=postgresql://user:password@localhost:5432/myapp` (matches `compose.yml`).                                     |
| `db:migrate` exits with "only allows local DATABASE_URL"        | `.env` points at a remote host.                           | For local: set `DATABASE_URL` to localhost. For production migrations: run in a one-off job with `ALLOW_DESTRUCTIVE_DB=local` set by the platform. |
| `db:seed:postgres` says "Postgres is not ready"                 | Container not up or not accepting connections.            | Run `pnpm db:up` then `pnpm db:migrate` (or `pnpm db:ready`), then `pnpm db:seed:postgres`.                                                        |
| `AttributeError: 'AsyncSession' object has no attribute '...'`  | Using sync SQLAlchemy API in async context.               | Use `await session.execute()` not `session.execute()`. Use `select()` not `query()`.                                                               |
| `sqlalchemy.exc.InvalidRequestError: Session is already closed` | Accessing lazy-loaded relationship outside async context. | Use `await obj.awaitable_attrs.relation` or eager load with `selectinload()`.                                                                      |
| `asyncpg.exceptions.UniqueViolationError`                       | Duplicate key in factory or test setup.                   | Ensure sequences are reset between tests or use unique values per test.                                                                            |
| `RuntimeError: DATABASE_URL is not set`                         | Environment variable not loaded.                          | Ensure `.env` file exists at root and contains `DATABASE_URL`.                                                                                     |
| Factory creates duplicate IDs                                   | Sequence not reset between test runs.                     | Use `factory.Sequence` with session-scoped fixtures or reset sequences in `db_session` fixture.                                                    |
| `pytest-asyncio` fixture errors                                 | Missing `loop_scope` or wrong scope.                      | Use `@pytest_asyncio.fixture(scope="session", loop_scope="session")` for session fixtures.                                                         |

Both `postgres://` and `postgresql://` URLs are supported; Alembic normalizes to `postgresql+psycopg2://` for the driver, while runtime uses `postgresql+asyncpg://`.

### Common Migration Issues

| Symptom                                    | Cause                                  | Fix                                                                           |
| ------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------- |
| Alembic autogenerate produces no changes   | `target_metadata` not set in `env.py`. | Ensure `target_metadata = Base.metadata` is set in `apps/api/alembic/env.py`. |
| Constraint names change between migrations | Missing naming convention.             | Use `NAMING_CONVENTION` in `Base.metadata` as shown in base model pattern.    |
| `asyncpg.exceptions.DuplicateTableError`   | Migration already applied manually.    | Run `alembic stamp head` to mark current state, then `alembic upgrade head`.  |

### For agents

- **New Postgres table/column:** Run `pnpm db:migrate:generate "description"` (or add a revision in `apps/api/alembic/versions/`), then `pnpm db:migrate`.
- **New Postgres seed data:** Edit `apps/postgres/seed/example.sql` (or add a file and wire it); run `pnpm db:seed:postgres`.
- **Qdrant collection/vectors:** Edit `apps/qdrant/scripts/seed-qdrant.mjs`; run `pnpm db:seed:qdrant`.
- **New SQLAlchemy model:** Inherit from `Base` and `TimestampMixin`, use `Mapped[]` annotations, add to `apps/api/src/models/`.
- **New test with database:** Use `db_session` fixture, inject into factories, assert on query results.
- **New factory:** Inherit from `AsyncSQLAlchemyFactory`, set `model` and `sqlalchemy_session_persistence` in `Meta` class.
