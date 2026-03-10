# Qdrant (local dev)

Where to edit collection config and seed data — and how to run seeding.

## Where things live

| What                           | Location                                         | Notes                                                                                                                                              |
| ------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Collection config (schema)** | `apps/qdrant/scripts/seed-qdrant.mjs`            | Qdrant has no migrations. Collection name, vector size, and distance are defined in this script (e.g. `vectors: { size: 4, distance: 'Cosine' }`). |
| **Seed (vectors + payloads)**  | Same file: `apps/qdrant/scripts/seed-qdrant.mjs` | The script creates or replaces the demo collection and upserts example points. Edit the `points` array to change seed data.                        |

One script defines both “schema” (collection config) and seed (points). For more collections or env-specific config, extend this script or add new scripts and wire them in root `package.json` (e.g. `db:seed:qdrant`).

## Seeding

- **Command:** `pnpm db:seed:qdrant` (from repo root). Requires `QDRANT_URL` in env (default `http://localhost:6333`). Only runs when the URL is local (localhost / 127.0.0.1 / 10.0.2.2); override with `ALLOW_DESTRUCTIVE_DB=local` for other local hosts.
- **What runs:** The script deletes the existing `demo` collection (if present), creates it with the configured vector size and distance, then upserts 3 example points.
- **Full reset (wipe + seed):** `pnpm db:reset` (both stores) or `pnpm db:reset:qdrant` (Qdrant only).

All db commands: [Database guide](../../../.docs/guides/database.md).

**Local:** REST `http://localhost:6333`, dashboard `http://localhost:6333/dashboard`, gRPC port `6334`.
