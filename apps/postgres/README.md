# Postgres (local dev)

Where to edit schema, config, and seed — and how to run seeding.

## Where things live

| What             | Location              | Notes                                                                                                                                                                      |
| ---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema (DDL)** | `apps/api/alembic/`   | Single source of truth. Add revisions in `alembic/versions/`; run `pnpm db:migrate` from repo root. Do not put `CREATE TABLE` in init or seed.                             |
| **Init**         | `apps/postgres/init/` | Optional scripts run only when the data directory is empty (e.g. first start after `db:reset`). Use for non-schema setup only; schema lives in Alembic.                    |
| **Seed (data)**  | `apps/postgres/seed/` | SQL files, e.g. `example.sql`. Run `pnpm db:seed:postgres` after `pnpm db:migrate`. Safe to re-run if idempotent (e.g. `TRUNCATE` + `INSERT` or `INSERT ... ON CONFLICT`). |

## Seeding

- **Command:** `pnpm db:seed:postgres` (from repo root). Requires Postgres up and migrations applied (`pnpm db:up` then `pnpm db:migrate`).
- **What runs:** `apps/postgres/seed/example.sql` is piped into `psql` in the Postgres container. Add more `.sql` files and wire them in `scripts/db-seed-postgres.mjs` if needed.
- **Full reset (wipe + migrate + seed):** `pnpm db:reset` (both stores) or `pnpm db:reset:postgres` (Postgres only).

All db commands: [Database guide](../../../.docs/guides/database.md).

**Local URL:** `postgresql://user:password@localhost:5432/myapp`.
