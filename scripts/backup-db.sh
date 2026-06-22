#!/usr/bin/env bash
# =============================================================================
# backup-db.sh — timestamped PostgreSQL dump from the postgres container.
#
#   ./scripts/backup-db.sh
#
# Writes backups/cloudmanagerpro-<timestamp>.sql.gz (override dir with BACKUP_DIR).
# Dumps use --clean --if-exists so they can be replayed by restore-db.sh.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$REPO_ROOT/docker"
ENV_FILE="$DOCKER_DIR/.env.production"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.prod.yml"

info() { printf '\033[1;34m[backup]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[backup]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[backup]\033[0m %s\n' "$*" >&2; }

getenv() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2-; }
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

[[ -f "$ENV_FILE" ]] || { err "Missing $ENV_FILE (copy docker/.env.production.example)."; exit 1; }

POSTGRES_USER="$(getenv POSTGRES_USER)"; POSTGRES_USER="${POSTGRES_USER:-cloudmanager}"
POSTGRES_DB="$(getenv POSTGRES_DB)";     POSTGRES_DB="${POSTGRES_DB:-cloudmanagerpro}"

BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/cloudmanagerpro-$TS.sql.gz"

info "Dumping database '$POSTGRES_DB' (user '$POSTGRES_USER') -> $OUT"
if ! dc exec -T postgres pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT"; then
  err "Backup failed; removing partial file."
  rm -f "$OUT"
  exit 1
fi

ok "Backup written: $OUT ($(du -h "$OUT" | cut -f1))"
