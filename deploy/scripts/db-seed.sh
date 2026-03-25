#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/common.sh"

usage() {
  cat <<'EOF'
Usage: db-seed.sh [--mode local|compose-run]

Seeds the database using apps/api/src/db/seed.ts.
EOF
}

CLI_DB_COMMAND_MODE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      CLI_DB_COMMAND_MODE="${2:?missing value for --mode}"
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
if [[ -n "$CLI_DB_COMMAND_MODE" ]]; then
  DB_COMMAND_MODE="$CLI_DB_COMMAND_MODE"
fi
init_runtime_dirs
require_database_url

log "Running database seed with mode=${DB_COMMAND_MODE:-local}"
run_app_command "npm exec --workspace @growthpilot/api tsx src/db/seed.ts"
