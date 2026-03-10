# Database (Postgres + Qdrant)

**Single source of truth:** root `compose.yml` only (project name `korb-db`). All db commands use this file; there are no per-service compose files.

- **Local dev:** `pnpm db:ready` (up + wait for healthy + migrate; then optionally `pnpm db:seed`), or `pnpm db:up` then `pnpm db:migrate` and seed as needed. Per-service reset (`db:reset:postgres`, `db:reset:qdrant`) stops one service, removes its volume, and brings it back using the same compose.
- **Coolify / production:** Use Coolify one-click Postgres and one-click Qdrant (or any remote). Set `DATABASE_URL` and `QDRANT_URL` on the API; do not deploy this compose. Same env contract everywhere.

**Ready to add something?** New Postgres table → `apps/api/alembic/versions/` (or `pnpm db:migrate:generate "description"`) then `pnpm db:migrate`. New Postgres seed → `apps/postgres/seed/`. New Qdrant collection/vectors → `apps/qdrant/scripts/seed-qdrant.mjs` then `pnpm db:seed:qdrant`. Full command list and where everything lives are below.

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

**Recommendation for this project:** **Keep Alembic.** It is the standard choice for FastAPI + Postgres, fits our current hand-written migrations and future SQLAlchemy models, and handles versioning and rollback well. Revisit alternatives only if we need advanced Postgres features (e.g. RLS, complex ENUMs) that Alembic autogenerate doesn’t handle well, or a declarative schema-as-code workflow (e.g. Atlas).

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

## Troubleshooting

| Symptom                                                  | Cause                                          | Fix                                                                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connection refused` or `ECONNREFUSED` (Postgres)        | Postgres not running or not ready yet.         | Run `pnpm db:up` then wait a few seconds, or use `pnpm db:ready` (waits for healthy).                                                              |
| `relation "example" does not exist` (or other table)     | Migrations not applied.                        | Run `pnpm db:migrate` (or `pnpm db:ready`).                                                                                                        |
| `role "user" does not exist` / auth errors               | Wrong credentials or wrong DB.                 | Ensure root `.env` has `DATABASE_URL=postgresql://user:password@localhost:5432/myapp` (matches `compose.yml`).                                     |
| `db:migrate` exits with "only allows local DATABASE_URL" | `.env` points at a remote host.                | For local: set `DATABASE_URL` to localhost. For production migrations: run in a one-off job with `ALLOW_DESTRUCTIVE_DB=local` set by the platform. |
| `db:seed:postgres` says "Postgres is not ready"          | Container not up or not accepting connections. | Run `pnpm db:up` then `pnpm db:migrate` (or `pnpm db:ready`), then `pnpm db:seed:postgres`.                                                        |

Both `postgres://` and `postgresql://` URLs are supported; Alembic normalizes to `postgresql+psycopg2://` for the driver.

## For agents

- **New Postgres table/column:** Run `pnpm db:migrate:generate "description"` (or add a revision in `apps/api/alembic/versions/`), then `pnpm db:migrate`.
- **New Postgres seed data:** Edit `apps/postgres/seed/example.sql` (or add a file and wire it); run `pnpm db:seed:postgres`.
- **Qdrant collection/vectors:** Edit `apps/qdrant/scripts/seed-qdrant.mjs`; run `pnpm db:seed:qdrant`.
