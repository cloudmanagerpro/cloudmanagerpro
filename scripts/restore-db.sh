#!/usr/bin/env bash
# =============================================================================
# restore-db.sh — restore the database from a backup created by backup-db.sh.
#
#   ./scripts/restore-db.sh backups/cloudmanagerpro-20260618-020000.sql.gz
#   ./scripts/restore-db.sh <file> --force   # skip the confirmation prompt
#
# WARNING: this overwrites the current database contents.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$REPO_ROOT/docker"
ENV_FILE="$DOCKER_DIR/.env.production"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.prod.yml"

info() { printf '\033[1;34m[restore]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[restore]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[restore]\033[0m %s\n' "$*" >&2; }

getenv() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2-; }
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

BACKUP_FILE="${1:-}"
FORCE="${2:-}"

[[ -n "$BACKUP_FILE" ]] || { err "Usage: $0 <backup-file.sql[.gz]> [--force]"; exit 1; }
[[ -f "$BACKUP_FILE" ]] || { err "Backup file not found: $BACKUP_FILE"; exit 1; }
[[ -f "$ENV_FILE" ]] || { err "Missing $ENV_FILE (copy docker/.env.production.example)."; exit 1; }

POSTGRES_USER="$(getenv POSTGRES_USER)"; POSTGRES_USER="${POSTGRES_USER:-cloudmanager}"
POSTGRES_DB="$(getenv POSTGRES_DB)";     POSTGRES_DB="${POSTGRES_DB:-cloudmanagerpro}"

# Confirmation guard.
if [[ "$FORCE" != "--force" && "${FORCE_RESTORE:-}" != "1" ]]; then
  err "This will OVERWRITE the contents of database '$POSTGRES_DB' from:"
  err "  $BACKUP_FILE"
  printf '\033[1;33m[restore]\033[0m Type "yes" to continue: ' >&2
  read -r answer
  [[ "$answer" == "yes" ]] || { info "Aborted — nothing changed."; exit 1; }
fi

info "Restoring '$POSTGRES_DB' from $BACKUP_FILE ..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | dc exec -T postgres psql -v ON_ERROR_STOP=0 -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null
else
  dc exec -T postgres psql -v ON_ERROR_STOP=0 -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE" >/dev/null
fi

ok "Restore complete. You may want to restart the backend: (cd docker && docker compose -f docker-compose.prod.yml restart backend)"
