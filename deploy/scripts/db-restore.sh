#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/common.sh"

usage() {
  cat <<'EOF'
Usage: db-restore.sh --input PATH

Restores a gzip-compressed PostgreSQL backup created by db-backup.sh.
EOF
}

INPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input)
      INPUT_FILE="$(resolve_path "${2:?missing value for --input}")"
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

[[ -n "$INPUT_FILE" ]] || fail "--input is required"

load_deploy_env
init_runtime_dirs
require_database_url

log "Restoring database from $INPUT_FILE"
psql_restore_from_file "$INPUT_FILE"
