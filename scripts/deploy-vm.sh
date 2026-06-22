#!/usr/bin/env bash
# =============================================================================
# deploy-vm.sh — first-time deploy / bring the full production stack up.
#
#   ./scripts/deploy-vm.sh
#
# Verifies Docker + Compose, requires docker/.env.production, then builds and
# starts the stack and waits for it to become healthy.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$REPO_ROOT/docker"
ENV_FILE="$DOCKER_DIR/.env.production"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.prod.yml"

info() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[deploy]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[deploy]\033[0m %s\n' "$*" >&2; }

getenv() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2-; }
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

# 1. Tooling.
command -v docker >/dev/null 2>&1 || { err "Docker is not installed. See docs/DEPLOYMENT_VM.md"; exit 1; }
docker compose version >/dev/null 2>&1 || { err "Docker Compose v2 ('docker compose') not found."; exit 1; }

# 2. Environment file.
if [[ ! -f "$ENV_FILE" ]]; then
  err "Missing $ENV_FILE"
  err "Create it first:  cp docker/.env.production.example docker/.env.production  (then edit it)"
  exit 1
fi

# 3. Build + start.
info "Building images and starting the stack (first build can take several minutes)..."
dc up -d --build

# 4. Wait for health.
info "Waiting for services to become healthy..."
if ! "$SCRIPT_DIR/healthcheck.sh" --wait 300; then
  err "Stack did not become healthy. Recent backend logs:"
  dc logs --tail=60 backend || true
  exit 1
fi

# 5. Report.
echo
dc ps
APP_DOMAIN="$(getenv APP_DOMAIN)"
ok "Deployment complete."
case "$APP_DOMAIN" in
  :*)        ok "App reachable at: http://localhost${APP_DOMAIN}" ;;
  localhost*) ok "App reachable at: https://${APP_DOMAIN} (internal/self-signed cert)" ;;
  *)         ok "App reachable at: https://${APP_DOMAIN}" ;;
esac
