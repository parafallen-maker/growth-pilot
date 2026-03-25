#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/common.sh"

usage() {
  cat <<'EOF'
Usage: rollback.sh [--backup PATH] [--skip-db-restore] [--health-url URL]

Rollback flow:
1. Restore the previous release env file if available.
2. Optionally restore the most recent database backup.
3. Restart services with docker compose.
4. Verify health endpoints.
EOF
}

SKIP_DB_RESTORE=0
BACKUP_FILE="${ROLLBACK_BACKUP_FILE:-}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-180}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-5}"
CLI_HEALTHCHECK_URLS=""
CLI_BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup)
      CLI_BACKUP_FILE="$(resolve_path "${2:?missing value for --backup}")"
      shift 2
      ;;
    --skip-db-restore)
      SKIP_DB_RESTORE=1
      shift
      ;;
    --health-url)
      if [[ -n "$CLI_HEALTHCHECK_URLS" ]]; then
        CLI_HEALTHCHECK_URLS="${CLI_HEALTHCHECK_URLS},${2:?missing value for --health-url}"
      else
        CLI_HEALTHCHECK_URLS="${2:?missing value for --health-url}"
      fi
      shift 2
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

DEPLOY_HEALTHCHECK_URLS="${DEPLOY_HEALTHCHECK_URLS:-http://127.0.0.1:3000/health,http://127.0.0.1:3000/health/ready}"
if [[ -n "$CLI_HEALTHCHECK_URLS" ]]; then
  if [[ -n "$DEPLOY_HEALTHCHECK_URLS" ]]; then
    DEPLOY_HEALTHCHECK_URLS="${DEPLOY_HEALTHCHECK_URLS},${CLI_HEALTHCHECK_URLS}"
  else
    DEPLOY_HEALTHCHECK_URLS="$CLI_HEALTHCHECK_URLS"
  fi
fi
if [[ -n "$CLI_BACKUP_FILE" ]]; then
  BACKUP_FILE="$CLI_BACKUP_FILE"
fi

init_compose

if [[ -f "$PREVIOUS_RELEASE_ENV_FILE" ]]; then
  cp "$PREVIOUS_RELEASE_ENV_FILE" "$CURRENT_RELEASE_ENV_FILE"
  init_compose
  log "Restored previous release env file"
else
  warn "No previous release env file found, rollback will only reuse the current compose configuration"
fi

if [[ "$SKIP_DB_RESTORE" -ne 1 ]]; then
  if [[ -z "$BACKUP_FILE" && -f "$LAST_BACKUP_FILE_RECORD" ]]; then
    BACKUP_FILE="$(<"$LAST_BACKUP_FILE_RECORD")"
  fi
  if [[ -z "$BACKUP_FILE" ]]; then
    BACKUP_FILE="$(latest_backup_file || true)"
  fi
  if [[ -n "$BACKUP_FILE" ]]; then
    log "Restoring database backup from $BACKUP_FILE"
    "$SCRIPT_DIR/db-restore.sh" --input "$BACKUP_FILE"
  else
    warn "No backup file found, skipping database restore"
  fi
fi

log "Pulling rollback images"
docker_compose pull

log "Restarting services after rollback"
docker_compose up -d --remove-orphans

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
      log "Rollback health checks passed"
      return 0
    fi

    now_ts="$(date +%s)"
    if (( now_ts - start_ts >= HEALTH_TIMEOUT_SECONDS )); then
      return 1
    fi

    sleep "$HEALTH_INTERVAL_SECONDS"
  done
}

verify_health || fail "Rollback completed but health checks are still failing"
