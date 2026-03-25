#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/common.sh"

usage() {
  cat <<'EOF'
Usage: db-reset.sh [--mode local|compose-run]

Drops and recreates the public schema, then reapplies migrations and seed data.
This command is blocked in production unless ALLOW_DB_RESET=1 is set explicitly.
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

if [[ "${NODE_ENV:-development}" == "production" && "${ALLOW_DB_RESET:-0}" != "1" ]]; then
  fail "db-reset is disabled in production. Set ALLOW_DB_RESET=1 only for controlled recovery work."
fi

log "Resetting database public schema"
reset_public_schema
run_app_command "npm exec --workspace @growthpilot/api drizzle-kit migrate -- --config drizzle.config.ts"
run_app_command "npm exec --workspace @growthpilot/api tsx src/db/seed.ts"
