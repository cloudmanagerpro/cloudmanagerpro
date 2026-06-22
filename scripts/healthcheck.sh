#!/usr/bin/env bash
# =============================================================================
# healthcheck.sh — check that the CloudManagerPro stack is healthy.
#
#   ./scripts/healthcheck.sh            # check once, now
#   ./scripts/healthcheck.sh --wait 240 # poll until healthy (or timeout secs)
#
# Verifies: PostgreSQL (pg_isready), backend (GET /api/health), frontend (:3000).
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$REPO_ROOT/docker"
ENV_FILE="$DOCKER_DIR/.env.production"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.prod.yml"

info() { printf '\033[1;34m[health]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[health]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[health]\033[0m %s\n' "$*" >&2; }
pass() { printf '  \033[1;32m✓\033[0m %s\n' "$*"; }
flunk(){ printf '  \033[1;31m✗\033[0m %s\n' "$*"; }

getenv() { [[ -f "$ENV_FILE" ]] && grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true; }
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

if [[ ! -f "$ENV_FILE" ]]; then
  err "Missing $ENV_FILE (copy docker/.env.production.example)."
  exit 1
fi

WAIT=0
TIMEOUT=180
if [[ "${1:-}" == "--wait" ]]; then WAIT=1; TIMEOUT="${2:-180}"; fi

POSTGRES_USER="$(getenv POSTGRES_USER)"; POSTGRES_USER="${POSTGRES_USER:-cloudmanager}"
POSTGRES_DB="$(getenv POSTGRES_DB)";     POSTGRES_DB="${POSTGRES_DB:-cloudmanagerpro}"
APP_DOMAIN="$(getenv APP_DOMAIN)"

check_db()       { dc exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; }
check_backend()  { dc exec -T backend curl -fsS http://localhost:8080/api/health >/dev/null 2>&1; }
check_frontend() { dc exec -T frontend wget -q -O /dev/null http://127.0.0.1:3000/ >/dev/null 2>&1; }

all_ok() { check_db && check_backend && check_frontend; }

if [[ "$WAIT" == "1" ]]; then
  info "Waiting up to ${TIMEOUT}s for all services to become healthy..."
  end=$(( $(date +%s) + TIMEOUT ))
  until all_ok; do
    if (( $(date +%s) >= end )); then
      err "Timed out after ${TIMEOUT}s waiting for services."
      break
    fi
    sleep 5
  done
fi

echo "CloudManagerPro service health:"
rc=0
if check_db;       then pass "database  (postgres pg_isready)"; else flunk "database  (postgres pg_isready)"; rc=1; fi
if check_backend;  then pass "backend   (GET /api/health)";     else flunk "backend   (GET /api/health)";     rc=1; fi
if check_frontend; then pass "frontend  (HTTP :3000)";          else flunk "frontend  (HTTP :3000)";          rc=1; fi

if [[ "$rc" == "0" ]]; then
  body="$(dc exec -T backend curl -fsS http://localhost:8080/api/health 2>/dev/null || true)"
  [[ -n "$body" ]] && info "backend /api/health -> $body"
  ok "All services healthy."
else
  err "One or more services are unhealthy. Inspect with: (cd docker && docker compose -f docker-compose.prod.yml ps)"
fi
exit "$rc"
