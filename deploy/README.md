# Deploy Assets

This directory contains the CI/CD and operational scripts for `INF-15` through `INF-21`, plus the helper examples referenced by the Wave 5 release docs for `INF-30` through `INF-39`.

## Expected Environment

The scripts load `deploy/.env` automatically when present. The most important variables are:

- `DATABASE_URL`: PostgreSQL connection string used by migrate, seed, backup, restore, and reset commands.
- `COMPOSE_FILE`: Optional colon-separated compose file list. Defaults to `docker-compose.prod.yml` when present, otherwise `docker-compose.yml`.
- `DEPLOY_IMAGE_TAG`: Image tag written into `deploy/state/current-release.env` for compose-based deployments that use env substitution.
- `DB_COMMAND_MODE`: `local` or `compose-run`. `compose-run` executes db commands via `docker compose run --rm <APP_SERVICE_NAME>`.
- `APP_SERVICE_NAME`: Compose service used for migration and seed commands. Defaults to `api`.
- `DB_SERVICE_NAME`: Compose service used for backup, restore, and reset fallback operations. Defaults to `postgres`.
- `DEPLOY_HEALTHCHECK_URLS`: Comma-separated URLs to verify after deploy and rollback. Defaults to `http://127.0.0.1:3000/health,http://127.0.0.1:3000/health/ready`.
- `DB_BACKUP_DIR`: Backup target directory. Defaults to `deploy/backups/postgres`.

If you keep the release secrets in the repository root `.env.prod`, invoke scripts with `DEPLOY_ENV_FILE=.env.prod` so the deploy helpers read the same values:

```bash
DEPLOY_ENV_FILE=.env.prod npm run db:backup
DEPLOY_ENV_FILE=.env.prod bash deploy/scripts/deploy.sh
```

## Common Commands

```bash
npm run db:migrate
npm run db:seed
npm run db:reset
npm run db:backup
npm run db:restore -- --input deploy/backups/postgres/your-backup.sql.gz
bash deploy/scripts/deploy.sh --image-tag v1.2.3
bash deploy/scripts/rollback.sh
```

## First-Deploy Notes

- `docker-compose.prod.yml` currently builds `api` and `web` from local Dockerfiles. On a clean host, bootstrap with:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build api web nginx
```

- `bash deploy/scripts/deploy.sh` remains useful for repeatable deploy flow with backup, migrate, restart, and health verification, but it does not replace the initial `--build` bootstrap on a clean host.
- Health endpoints are `http(s)://<host>/health` and `http(s)://<host>/health/ready`.
- The repository default routing is single-domain: frontend on `/`, API on `/api`.

## Daily Backup Cron

1. Copy `deploy/cron/db-backup.cron` and replace `/srv/growthpilot` with the real repo path, or:
2. Run `bash deploy/scripts/install-db-backup-cron.sh`.

The backup routine keeps the latest 30 days by default and writes logs to `deploy/logs/db-backup.log`.

## SSL Placeholders

- `deploy/nginx/ssl/certbot/` is reserved for Let's Encrypt assets mounted by nginx or certbot jobs.
- `deploy/nginx/ssl/self-signed/generate-self-signed-cert.sh` generates a local test certificate pair without changing nginx configs.
- `deploy/examples/nginx.growthpilot.edge.conf.example` is the recommended first-production topology when TLS is terminated on the host nginx and proxied to the compose nginx on `127.0.0.1:8080`.
