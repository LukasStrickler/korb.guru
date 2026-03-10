"""
Alembic migration environment. Reads DATABASE_URL from environment (set by root
dotenv when using pnpm db:migrate). Run from apps/api: uv run alembic upgrade head.

When the API has SQLAlchemy Base/metadata: set target_metadata = Base.metadata below
and add a naming_convention on Base for stable autogenerate (see Alembic naming docs).
"""

import os
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import create_engine, pool

from alembic import context

# Load root .env when running from monorepo root (e.g. pnpm db:migrate)
# so DATABASE_URL is available without cd apps/api/.env
env_paths = (
    os.path.join(os.getcwd(), ".env"),
    os.path.join(os.getcwd(), "..", ".env"),
)
for path in env_paths:
    if os.path.isfile(path):
        load_dotenv(path)
        break

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

database_url = os.environ.get("DATABASE_URL")
if database_url:
    # Ensure psycopg2 driver for postgres(ql):// URLs (support both schemes)
    if database_url.startswith("postgres://") and "postgres+" not in database_url:
        database_url = "postgresql+psycopg2://" + database_url.split("://", 1)[1]
    elif database_url.startswith("postgresql://") and "postgresql+" not in database_url:
        database_url = "postgresql+psycopg2://" + database_url.split("://", 1)[1]
    config.set_main_option("sqlalchemy.url", database_url)

target_metadata = None


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = create_engine(
        config.get_main_option("sqlalchemy.url", ""),
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
