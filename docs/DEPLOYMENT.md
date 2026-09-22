# Deployment

## Local / staging — Docker Compose

```bash
cp backend/.env.example backend/.env      # edit values, especially JWT_SECRET_KEY
docker compose up --build
```

This starts Postgres, Redis, the backend (migrations run automatically on
container start via `backend/entrypoint.sh`), the frontend built for
production and served by nginx, and a top-level nginx reverse proxy on
`http://localhost` routing `/api/*` to the backend and everything else to the
frontend. Individual services are also reachable directly: backend on
`:8000`, frontend on `:5173`, Postgres on `:5432`, Redis on `:6379`.

Seed demo data once the stack is up:

```bash
docker compose exec backend python -m scripts.seed_data
```

### Local development (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Runs `uvicorn --reload` for the backend and the Vite dev server for the
frontend, with source directories bind-mounted.

## Production — AWS

See [`infra/README.md`](../infra/README.md) for the full target architecture
(S3 + CloudFront for the frontend, ECS Fargate behind an ALB for the backend,
RDS for Postgres, ElastiCache for Redis, Secrets Manager for credentials) and
[`infra/ecs/backend-task-definition.json`](../infra/ecs/backend-task-definition.json)
for the ECS task definition template. No AWS credentials were available in
this environment, so nothing there has been applied or live-verified — treat
it as a reviewed starting point, not a deployed environment.

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`:

1. **backend** job — spins up a throwaway Postgres service container, runs
   `ruff check`, `mypy`, `alembic upgrade head`, then `pytest --cov`.
2. **frontend** job — `npm run lint`, `npm run build` (type-checks via `tsc -b`
   then bundles), `npm run test` (Vitest).
3. **docker-build** job (push only) — builds both production Docker images to
   confirm the Dockerfiles stay buildable.

Add a `deploy` job once AWS OIDC credentials are configured in the repo's
secrets (see the checklist at the bottom of `infra/README.md`).

## Required environment variables (production)

| Variable | Notes |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_SYNC` | RDS endpoint, `+asyncpg` / `+psycopg2` drivers respectively |
| `REDIS_URL` | ElastiCache endpoint |
| `JWT_SECRET_KEY` | 32+ random bytes, rotate via Secrets Manager |
| `CORS_ORIGINS` | Exact production frontend origin(s), comma-separated |
| `ENVIRONMENT` | `production` (switches structured JSON logging, disables debug) |
| `AWS_S3_BUCKET` / `AWS_REGION` | If serving expense attachments / generated PDFs from S3 |

Never commit `.env` — both `backend/.env` and `frontend/.env*` (besides
`.env.example`) are gitignored.
