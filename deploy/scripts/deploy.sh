#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/common.sh"

usage() {
  cat <<'EOF'
Usage: deploy.sh [--image-tag TAG] [--health-url URL] [--skip-backup] [--skip-seed]

Deployment flow:
1. Pull the target images with docker compose.
2. Create a pre-deploy database backup.
3. Run migrations and optional seed.
4. Restart services.
5. Verify health endpoints.
6. Roll back automatically on failure.
EOF
}

SKIP_BACKUP=0
SKIP_SEED=1
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-180}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-5}"
DEPLOY_SERVICES="${DEPLOY_SERVICES:-}"
CLI_IMAGE_TAG=""
CLI_HEALTHCHECK_URLS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image-tag)
      CLI_IMAGE_TAG="${2:?missing value for --image-tag}"
      shift 2
      ;;
    --health-url)
      if [[ -n "$CLI_HEALTHCHECK_URLS" ]]; then
        CLI_HEALTHCHECK_URLS="${CLI_HEALTHCHECK_URLS},${2:?missing value for --health-url}"
      else
        CLI_HEALTHCHECK_URLS="${2:?missing value for --health-url}"
      fi
      shift 2
      ;;
    --skip-backup)
      SKIP_BACKUP=1
      shift
      ;;
    --skip-seed)
      SKIP_SEED=1
      shift
      ;;
    --seed)
      SKIP_SEED=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

load_deploy_env
init_runtime_dirs
require_database_url
ensure_command curl

DEPLOY_IMAGE_TAG="${CLI_IMAGE_TAG:-${DEPLOY_IMAGE_TAG:-$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || timestamp_utc)}}"
DEPLOY_HEALTHCHECK_URLS="${DEPLOY_HEALTHCHECK_URLS:-http://127.0.0.1:3000/health,http://127.0.0.1:3000/health/ready}"
if [[ -n "$CLI_HEALTHCHECK_URLS" ]]; then
  if [[ -n "$DEPLOY_HEALTHCHECK_URLS" ]]; then
    DEPLOY_HEALTHCHECK_URLS="${DEPLOY_HEALTHCHECK_URLS},${CLI_HEALTHCHECK_URLS}"
  else
    DEPLOY_HEALTHCHECK_URLS="$CLI_HEALTHCHECK_URLS"
  fi
fi
DB_COMMAND_MODE="${DEPLOY_DB_COMMAND_MODE:-compose-run}"

if [[ -f "$CURRENT_RELEASE_ENV_FILE" ]]; then
  cp "$CURRENT_RELEASE_ENV_FILE" "$PREVIOUS_RELEASE_ENV_FILE"
fi

cat >"$CURRENT_RELEASE_ENV_FILE" <<EOF
APP_IMAGE_TAG=${DEPLOY_IMAGE_TAG}
API_IMAGE_TAG=${API_IMAGE_TAG:-$DEPLOY_IMAGE_TAG}
WEB_IMAGE_TAG=${WEB_IMAGE_TAG:-$DEPLOY_IMAGE_TAG}
API_IMAGE_REPOSITORY=${API_IMAGE_REPOSITORY:-ghcr.io/${GITHUB_REPOSITORY_OWNER:-growthpilot}/growthpilot-api}
WEB_IMAGE_REPOSITORY=${WEB_IMAGE_REPOSITORY:-ghcr.io/${GITHUB_REPOSITORY_OWNER:-growthpilot}/growthpilot-web}
EOF

init_compose

run_compose_cmd() {
  if [[ -n "$DEPLOY_SERVICES" ]]; then
    docker_compose "$@" $DEPLOY_SERVICES
  else
    docker_compose "$@"
  fi
}

verify_health() {
  local raw_urls url
  local start_ts now_ts

  raw_urls="${DEPLOY_HEALTHCHECK_URLS//,/ }"
  start_ts="$(date +%s)"

  while true; do
    local all_ok=1

    for url in $raw_urls; do
      if ! curl --fail --silent --show-error --max-time 10 "$url" >/dev/null; then
        all_ok=0
        break
      fi
    done

    if [[ "$all_ok" -eq 1 ]]; then
      log "Health checks passed"
      return 0
    fi

    now_ts="$(date +%s)"
    if (( now_ts - start_ts >= HEALTH_TIMEOUT_SECONDS )); then
      return 1
    fi

    sleep "$HEALTH_INTERVAL_SECONDS"
  done
}

BACKUP_FILE=""
if [[ "$SKIP_BACKUP" -ne 1 ]]; then
  BACKUP_FILE="$("$SCRIPT_DIR/db-backup.sh" --label "predeploy-${DEPLOY_IMAGE_TAG}" --keep-days "${DB_BACKUP_KEEP_DAYS:-30}")"
  printf '%s\n' "$BACKUP_FILE" >"$LAST_BACKUP_FILE_RECORD"
fi

log "Pulling target images"
run_compose_cmd pull

log "Running migrations"
"$SCRIPT_DIR/db-migrate.sh" --mode "$DB_COMMAND_MODE"

if [[ "$SKIP_SEED" -ne 1 ]]; then
  log "Running seed data"
  "$SCRIPT_DIR/db-seed.sh" --mode "$DB_COMMAND_MODE"
fi

log "Restarting services"
run_compose_cmd up -d --remove-orphans

if ! verify_health; then
  warn "Deployment health checks failed, starting rollback"
  if [[ -n "$BACKUP_FILE" ]]; then
    ROLLBACK_BACKUP_FILE="$BACKUP_FILE" "$SCRIPT_DIR/rollback.sh"
  else
    "$SCRIPT_DIR/rollback.sh" --skip-db-restore
  fi
  fail "Deployment failed and rollback was invoked"
fi

log "Deployment finished successfully"
