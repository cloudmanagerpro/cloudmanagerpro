#!/usr/bin/env bash
# =============================================================================
# update-vm.sh — pull the latest code and rebuild/restart the stack.
#
#   ./scripts/update-vm.sh
#
# Tip: run ./scripts/backup-db.sh first.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$REPO_ROOT/docker"
ENV_FILE="$DOCKER_DIR/.env.production"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.prod.yml"

info() { printf '\033[1;34m[update]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[update]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[update]\033[0m %s\n' "$*" >&2; }

dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

command -v docker >/dev/null 2>&1 || { err "Docker is not installed."; exit 1; }
docker compose version >/dev/null 2>&1 || { err "Docker Compose v2 ('docker compose') not found."; exit 1; }
[[ -f "$ENV_FILE" ]] || { err "Missing $ENV_FILE (copy docker/.env.production.example)."; exit 1; }

# 1. Pull latest code (fast-forward only to avoid surprise merges).
if command -v git >/dev/null 2>&1 && git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  info "Pulling latest code..."
  git -C "$REPO_ROOT" pull --ff-only
else
  info "Not a git checkout — skipping 'git pull' and rebuilding current sources."
fi

# 2. Rebuild + restart.
info "Rebuilding images and restarting the stack..."
dc up -d --build

# 3. Health.
info "Waiting for services to become healthy..."
if ! "$SCRIPT_DIR/healthcheck.sh" --wait 300; then
  err "Stack unhealthy after update. Recent backend logs:"
  dc logs --tail=60 backend || true
  exit 1
fi
ok "Update complete."
