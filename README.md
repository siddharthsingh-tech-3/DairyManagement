# Kshirsagar Dairy — Distribution Suite

A production-ready B2B dairy distribution management system: a distributor
supplies packaged milk/dairy products to retail vendors via truck routes,
tracks reusable crates, and bills vendors with GST invoices.

Built from the interactive prototype in `Dairy-Application-Planning/` — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the prototype's
modules map onto this implementation.

**Roles**: Admin/Staff, Vendor, Truck Owner (Driver) — with an admin-editable
permission matrix controlling what Vendors/Drivers can see and do.

**Modules**: Vendors & ledgers · Demand scheduling (orders) · Delivery &
dispatch · Crate lifecycle & disputes · Products & stock · GST billing &
payments · Users & access control · Reports & audit log · Expenses / P&L.

## Tech stack

- **Backend**: FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, PostgreSQL, JWT + refresh tokens, argon2, repository/service layered architecture.
- **Frontend**: React 19, TypeScript, Vite, Material UI, React Router, TanStack Query, React Hook Form + Zod, Zustand, Recharts, Axios, Day.js.
- **Infra**: Docker Compose (Postgres, Redis, backend, frontend, nginx), GitHub Actions CI, AWS deployment sketch (ECS/S3/CloudFront/RDS/Secrets Manager).

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env
docker compose up --build
docker compose exec backend python -m scripts.seed_data
```

Visit `http://localhost` (nginx reverse proxy). Demo logins (password
`ChangeMe123!`): `admin@kshirsagardairy.com`, `vendor@kshirsagardairy.com`,
`driver@kshirsagardairy.com`.

Full instructions, local hot-reload workflow, and the AWS deployment target:
see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Manual setup (without Docker)

**Backend** (Python 3.12, PostgreSQL 16 running locally):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements-dev.txt
cp .env.example .env   # point DATABASE_URL(_SYNC) at your local Postgres
alembic upgrade head
python -m scripts.seed_data
uvicorn app.main:app --reload
```

**Frontend** (Node 20+):

```bash
cd frontend
npm install
npm run dev
```

## Testing

```bash
# backend (needs a reachable Postgres — models use native UUID/ENUM types)
cd backend && pytest --cov=app

# frontend
cd frontend && npm run lint && npm run build && npm run test
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — backend/frontend layering, RBAC design, business rules
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema, ERD, migrations, seed data
- [`docs/API.md`](docs/API.md) — endpoint groups, conventions, Swagger/Postman
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Docker Compose, CI/CD, AWS
- [`infra/README.md`](infra/README.md) — AWS architecture detail

## Project structure

```
Dairy-Application/
  backend/     FastAPI app (api/services/repositories/models/schemas/core), Alembic, pytest
  frontend/    React 19 + Vite app (api/components/features/pages/store/hooks)
  docs/        Architecture, database, API, deployment docs
  infra/       AWS deployment sketch (ECS task def, architecture notes)
  nginx/       Reverse-proxy config used by docker-compose
  .github/     CI workflow
  docker-compose.yml / docker-compose.dev.yml
```

## A note on this build

This repository was generated end-to-end from the `Dairy-Application-Planning`
prototype in an environment without Python, Docker, or a local PostgreSQL
instance available — the backend was written and statically reviewed but not
executed locally; the frontend was built, linted, and unit-tested with Node.
Run the backend test suite (`pytest`) against a real Postgres instance — via
`docker compose up` — before treating it as verified, per
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
