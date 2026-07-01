#!/usr/bin/env bash
# Runs ON the EC2 instance after files are synced. Called by GitHub Actions.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found in ${ROOT}"
  echo "Create .env on the server before deploying (copy from .env.example and fill production values)."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed. Run scripts/ec2-bootstrap.sh on the server first."
  exit 1
fi

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

echo "==> Building and starting Perfecto stack..."
$COMPOSE up -d --build --remove-orphans

echo "==> Container status:"
$COMPOSE ps

echo "==> Deploy complete."
