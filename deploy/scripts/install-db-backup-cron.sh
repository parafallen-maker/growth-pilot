#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/common.sh"

usage() {
  cat <<'EOF'
Usage: install-db-backup-cron.sh [--schedule "0 3 * * *"] [--keep-days 30]

Installs a managed cron entry that runs db-backup.sh once per day.
EOF
}

SCHEDULE="${DB_BACKUP_CRON_SCHEDULE:-0 3 * * *}"
KEEP_DAYS="${DB_BACKUP_KEEP_DAYS:-30}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --schedule)
      SCHEDULE="${2:?missing value for --schedule}"
      shift 2
      ;;
    --keep-days)
      KEEP_DAYS="${2:?missing value for --keep-days}"
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
ensure_command crontab

REPO_PATH="$(resolve_path ".")"
ENV_PATH="${DEPLOY_ENV_FILE:-$DEPLOY_ROOT/.env}"
LOG_PATH="$LOG_DIR/db-backup.log"
CRON_MARKER="# growthpilot-db-backup"
CRON_LINE="$SCHEDULE DEPLOY_ENV_FILE=$ENV_PATH cd $REPO_PATH && /bin/bash $REPO_PATH/deploy/scripts/db-backup.sh --keep-days $KEEP_DAYS >> $LOG_PATH 2>&1 $CRON_MARKER"

TMP_CRON_FILE="$(mktemp)"
trap 'rm -f "$TMP_CRON_FILE"' EXIT

(crontab -l 2>/dev/null || true) | grep -Fv "$CRON_MARKER" >"$TMP_CRON_FILE"
printf '%s\n' "$CRON_LINE" >>"$TMP_CRON_FILE"
crontab "$TMP_CRON_FILE"

log "Installed cron entry: $CRON_LINE"
