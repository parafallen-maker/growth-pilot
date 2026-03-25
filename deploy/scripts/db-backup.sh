#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/common.sh"

usage() {
  cat <<'EOF'
Usage: db-backup.sh [--label LABEL] [--output-dir PATH] [--keep-days N]

Creates a gzip-compressed PostgreSQL backup with pg_dump and prunes expired backups.
EOF
}

LABEL="manual"
KEEP_DAYS="${DB_BACKUP_KEEP_DAYS:-30}"
CLI_OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label)
      LABEL="${2:?missing value for --label}"
      shift 2
      ;;
    --output-dir)
      CLI_OUTPUT_DIR="$(resolve_path "${2:?missing value for --output-dir}")"
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
if [[ -n "$CLI_OUTPUT_DIR" ]]; then
  DB_BACKUP_DIR="$CLI_OUTPUT_DIR"
fi
init_runtime_dirs
require_database_url

mkdir -p "$DB_BACKUP_DIR"
BACKUP_FILE="$DB_BACKUP_DIR/growthpilot_${LABEL}_$(timestamp_utc).sql.gz"

log "Creating database backup at $BACKUP_FILE"
pg_dump_to_file "$BACKUP_FILE"
prune_old_backups "$KEEP_DAYS"
printf '%s\n' "$BACKUP_FILE" >"$LAST_BACKUP_FILE_RECORD"
printf '%s\n' "$BACKUP_FILE"
