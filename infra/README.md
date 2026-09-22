# AWS deployment architecture

This folder sketches the production topology for the Kshirsagar Dairy Distribution
Suite. Nothing here is auto-applied — it is a reviewed starting point for
whoever provisions the AWS account (no AWS credentials were available in this
environment to provision or verify it live).

## Components

| Layer | Service | Notes |
|---|---|---|
| Frontend | S3 (private bucket) + CloudFront | `frontend/` build output (`npm run build` → `dist/`) uploaded to S3; CloudFront serves it with an Origin Access Control and a custom error response mapping 403/404 → `/index.html` (SPA routing). |
| Backend API | ECS Fargate (or App Runner) | Runs the `backend/Dockerfile` image behind an Application Load Balancer. Task definition: [`ecs/backend-task-definition.json`](./ecs/backend-task-definition.json). Horizontal scaling via ECS service auto-scaling on CPU/ALB request count. |
| Database | RDS for PostgreSQL 16 | Multi-AZ for production, automated backups, `DATABASE_URL`/`DATABASE_URL_SYNC` point here. Run `alembic upgrade head` (the backend entrypoint does this automatically on container start) as part of each deploy. |
| Cache/queue | ElastiCache for Redis | Used for rate limiting and (future) Celery task queue. |
| Object storage | S3 (private) | Expense attachments, generated PDFs — `AWS_S3_BUCKET` setting. |
| Secrets | AWS Secrets Manager | `JWT_SECRET_KEY`, DB credentials, Redis URL — injected into the ECS task via the `secrets` block, never baked into the image. |
| DNS/TLS | Route 53 + ACM | ACM cert on both the CloudFront distribution and the ALB listener (443). |

## Request flow

```
Browser → CloudFront (S3 static) ──┐
                                     ├─ /api/* → ALB → ECS backend tasks → RDS / ElastiCache
Browser → ALB (api.<domain>) ───────┘
```

In this repo's Docker Compose stack, the same shape is approximated locally by
the `nginx` service (`nginx/nginx.conf`) routing `/api/*` to `backend` and
everything else to `frontend`.

## CI/CD

`.github/workflows/ci.yml` lints, type-checks, tests and builds both images on
every push/PR. A deploy workflow should be added once AWS credentials are
available in GitHub Actions secrets (`AWS_ROLE_ARN` via OIDC is preferred over
long-lived access keys); it would:

1. Build & push `backend`/`frontend` images to ECR.
2. Register a new ECS task definition revision from
   `infra/ecs/backend-task-definition.json` with the new image tag.
3. Update the ECS service (`aws ecs update-service --force-new-deployment`).
4. Sync the frontend `dist/` to S3 and invalidate the CloudFront distribution.

## Environment variables / secrets checklist

See `backend/.env.example` and `frontend/.env.example` for the full list. At
minimum, production needs: `DATABASE_URL`, `DATABASE_URL_SYNC`, `REDIS_URL`,
`JWT_SECRET_KEY` (32+ random bytes, rotated via Secrets Manager), `CORS_ORIGINS`
set to the real frontend domain, and `ENVIRONMENT=production`.
