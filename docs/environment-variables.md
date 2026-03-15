# Environment Variables

All configuration is done via environment variables, loaded from `.env` file.

## PostgreSQL

| Variable            | Default       | Description            |
| ------------------- | ------------- | ---------------------- |
| `POSTGRES_USER`     | `korb`        | Database username      |
| `POSTGRES_PASSWORD` | `korb_secret` | Database password      |
| `POSTGRES_DB`       | `korb_guru`   | Database name          |
| `DATABASE_URL`      | (derived)     | Full connection string |

## Qdrant

| Variable         | Default  | Description                                 |
| ---------------- | -------- | ------------------------------------------- |
| `QDRANT_MODE`    | `cloud`  | Mode: `cloud`, `docker`, `local`, `memory`  |
| `QDRANT_URL`     | -        | Cloud cluster URL (required for cloud mode) |
| `QDRANT_API_KEY` | -        | Cloud API key (required for cloud mode)     |
| `QDRANT_HOST`    | `qdrant` | Docker service hostname                     |
| `QDRANT_PORT`    | `6333`   | Qdrant port                                 |

## Embeddings

| Variable             | Default | Description                           |
| -------------------- | ------- | ------------------------------------- |
| `EMBEDDING_PROVIDER` | `local` | `local` (FastEmbed) or `openai`       |
| `OPENAI_API_KEY`     | -       | Required only if provider is `openai` |

## Authentication

| Variable             | Default     | Description                                |
| -------------------- | ----------- | ------------------------------------------ |
| `JWT_SECRET_KEY`     | `change-me` | JWT signing secret (change in production!) |
| `JWT_ALGORITHM`      | `HS256`     | JWT algorithm                              |
| `JWT_EXPIRE_MINUTES` | `1440`      | Token expiry (24 hours)                    |

## Apify

| Variable      | Default | Description                        |
| ------------- | ------- | ---------------------------------- |
| `APIFY_TOKEN` | -       | Apify API token for running Actors |

## Application

| Variable       | Default                                             | Description          |
| -------------- | --------------------------------------------------- | -------------------- |
| `CORS_ORIGINS` | `["http://localhost:3000","http://localhost:5173"]` | Allowed CORS origins |
| `LOG_LEVEL`    | `INFO`                                              | Logging level        |
