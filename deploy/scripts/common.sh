#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$DEPLOY_ROOT/.." && pwd)"

declare -a COMPOSE_ARGS=()

log() {
  >&2 printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$*"
}

warn() {
  >&2 printf '[%s] WARN: %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$*"
}

fail() {
  >&2 printf '[%s] ERROR: %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$*"
  exit 1
}

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

resolve_path() {
  local path="${1:?path is required}"

  if [[ "$path" = /* ]]; then
    printf '%s\n' "$path"
  else
    printf '%s\n' "$REPO_ROOT/$path"
  fi
}

timestamp_utc() {
  date -u '+%Y%m%dT%H%M%SZ'
}

load_deploy_env() {
  local env_file="${DEPLOY_ENV_FILE:-$DEPLOY_ROOT/.env}"

  if [[ -f "$env_file" ]]; then
    log "Loading env from $env_file"
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

init_runtime_dirs() {
  STATE_DIR="$(resolve_path "${DEPLOY_STATE_DIR:-deploy/state}")"
  DB_BACKUP_DIR="$(resolve_path "${DB_BACKUP_DIR:-deploy/backups/postgres}")"
  LOG_DIR="$(resolve_path "${DEPLOY_LOG_DIR:-deploy/logs}")"
  CURRENT_RELEASE_ENV_FILE="${CURRENT_RELEASE_ENV_FILE:-$STATE_DIR/current-release.env}"
  PREVIOUS_RELEASE_ENV_FILE="${PREVIOUS_RELEASE_ENV_FILE:-$STATE_DIR/previous-release.env}"
  LAST_BACKUP_FILE_RECORD="${LAST_BACKUP_FILE_RECORD:-$STATE_DIR/last-backup.path}"

  mkdir -p "$STATE_DIR" "$DB_BACKUP_DIR" "$LOG_DIR"
}

init_compose() {
  local raw_files=()
  local raw_file resolved_file

  ensure_command docker

  if [[ -n "${COMPOSE_FILE:-}" ]]; then
    IFS=':' read -r -a raw_files <<<"${COMPOSE_FILE}"
  elif [[ -f "$REPO_ROOT/docker-compose.prod.yml" ]]; then
    raw_files=("docker-compose.prod.yml")
  elif [[ -f "$REPO_ROOT/docker-compose.yml" ]]; then
    raw_files=("docker-compose.yml")
  else
    fail "No compose file found. Set COMPOSE_FILE explicitly."
  fi

  COMPOSE_ARGS=()
  for raw_file in "${raw_files[@]}"; do
    resolved_file="$(resolve_path "$raw_file")"
    [[ -f "$resolved_file" ]] || fail "Compose file not found: $resolved_file"
    COMPOSE_ARGS+=(-f "$resolved_file")
  done

  if [[ -f "$CURRENT_RELEASE_ENV_FILE" ]]; then
    COMPOSE_ARGS+=(--env-file "$CURRENT_RELEASE_ENV_FILE")
  fi
}

docker_compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

compose_service_exists() {
  local service_name="${1:?service name is required}"

  docker_compose config --services | grep -Fxq "$service_name"
}

require_database_url() {
  [[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is required"
}

database_url_field() {
  local field="${1:?field is required}"

  require_database_url
  DATABASE_URL_FIELD="$field" node <<'NODE'
const { URL } = require('node:url');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write('DATABASE_URL is required\n');
  process.exit(1);
}

const parsed = new URL(databaseUrl);
const fields = {
  host: parsed.hostname,
  port: parsed.port || '5432',
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ''),
};

const field = process.env.DATABASE_URL_FIELD;
if (!Object.prototype.hasOwnProperty.call(fields, field)) {
  process.stderr.write(`Unknown DATABASE_URL field: ${field}\n`);
  process.exit(1);
}

process.stdout.write(String(fields[field]));
NODE
}

run_app_command() {
  local command_text="${1:?command text is required}"
  local mode="${DB_COMMAND_MODE:-local}"

  if [[ "$mode" == "compose-run" ]]; then
    local service_name="${APP_SERVICE_NAME:-api}"
    local app_workdir="${APP_WORKDIR:-/app}"

    init_compose
    compose_service_exists "$service_name" || fail "Compose service not found for app commands: $service_name"
    docker_compose run --rm "$service_name" sh -lc "cd \"$app_workdir\" && $command_text"
    return
  fi

  (
    cd "$REPO_ROOT"
    bash -lc "$command_text"
  )
}

pg_dump_to_file() {
  local target_file="${1:?target file is required}"
  local db_service="${DB_SERVICE_NAME:-postgres}"
  local host port user password database

  require_database_url
  mkdir -p "$(dirname "$target_file")"

  if command -v pg_dump >/dev/null 2>&1; then
    pg_dump --clean --if-exists --no-owner --no-privileges "$DATABASE_URL" | gzip -c >"$target_file"
    return
  fi

  init_compose
  compose_service_exists "$db_service" || fail "pg_dump is not available locally and compose db service was not found: $db_service"

  host="$(database_url_field host)"
  port="$(database_url_field port)"
  user="$(database_url_field user)"
  password="$(database_url_field password)"
  database="$(database_url_field database)"

  docker_compose exec -T -e PGPASSWORD="$password" "$db_service" \
    pg_dump --clean --if-exists --no-owner --no-privileges \
    -h "$host" -p "$port" -U "$user" -d "$database" | gzip -c >"$target_file"
}

psql_restore_from_file() {
  local source_file="${1:?source file is required}"
  local db_service="${DB_SERVICE_NAME:-postgres}"
  local host port user password database

  require_database_url
  [[ -f "$source_file" ]] || fail "Backup file not found: $source_file"

  if command -v psql >/dev/null 2>&1; then
    gzip -dc "$source_file" | psql "$DATABASE_URL"
    return
  fi

  init_compose
  compose_service_exists "$db_service" || fail "psql is not available locally and compose db service was not found: $db_service"

  host="$(database_url_field host)"
  port="$(database_url_field port)"
  user="$(database_url_field user)"
  password="$(database_url_field password)"
  database="$(database_url_field database)"

  gzip -dc "$source_file" | docker_compose exec -T -e PGPASSWORD="$password" "$db_service" \
    psql -v ON_ERROR_STOP=1 -h "$host" -p "$port" -U "$user" -d "$database"
}

reset_public_schema() {
  local db_service="${DB_SERVICE_NAME:-postgres}"
  local host port user password database
  local sql_text='DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'

  require_database_url

  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "$sql_text"
    return
  fi

  init_compose
  compose_service_exists "$db_service" || fail "psql is not available locally and compose db service was not found: $db_service"

  host="$(database_url_field host)"
  port="$(database_url_field port)"
  user="$(database_url_field user)"
  password="$(database_url_field password)"
  database="$(database_url_field database)"

  docker_compose exec -T -e PGPASSWORD="$password" "$db_service" \
    psql -v ON_ERROR_STOP=1 -h "$host" -p "$port" -U "$user" -d "$database" -c "$sql_text"
}

latest_backup_file() {
  find "$DB_BACKUP_DIR" -type f -name '*.sql.gz' -print | sort | tail -n 1
}

prune_old_backups() {
  local keep_days="${1:-30}"

  find "$DB_BACKUP_DIR" -type f -name '*.sql.gz' -mtime "+$keep_days" -delete
}
