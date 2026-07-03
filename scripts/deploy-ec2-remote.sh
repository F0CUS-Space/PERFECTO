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

install_docker() {
  echo "==> Docker not found — installing..."
  SUDO=""
  [[ "$(id -u)" -ne 0 ]] && SUDO="sudo"

  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y ca-certificates curl
    curl -fsSL https://get.docker.com | $SUDO sh
  elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y docker docker-compose-plugin
    $SUDO systemctl enable --now docker
  elif command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y docker
    $SUDO systemctl enable --now docker
  else
    echo "ERROR: Unsupported OS. Install Docker manually, then re-run deploy."
    exit 1
  fi

  $SUDO systemctl enable docker 2>/dev/null || true
  $SUDO systemctl start docker 2>/dev/null || true
}

if ! command -v docker >/dev/null 2>&1; then
  install_docker
fi

# Use sudo when the deploy user is not in the docker group yet (common right after install).
docker_cmd() {
  if docker info >/dev/null 2>&1; then
    echo "docker"
  elif sudo docker info >/dev/null 2>&1; then
    echo "sudo docker"
  else
    echo "ERROR: Docker installed but not usable. Run: sudo usermod -aG docker \$USER && newgrp docker" >&2
    exit 1
  fi
}

DOCKER="$(docker_cmd)"

if $DOCKER compose version >/dev/null 2>&1; then
  COMPOSE="$DOCKER compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
elif sudo docker-compose version >/dev/null 2>&1; then
  COMPOSE="sudo docker-compose"
else
  echo "ERROR: docker compose not available. Re-run deploy after Docker finishes installing."
  exit 1
fi

echo "==> Cleaning unused Docker artifacts from past deploys..."
bash "${ROOT}/scripts/ec2-docker-cleanup.sh"

echo "==> Building migrate image..."
$COMPOSE build migrate

echo "==> Building app image..."
$COMPOSE build app

echo "==> Starting Perfecto stack..."
# Build sequentially above to limit peak disk use on small EC2 volumes.
$COMPOSE up -d --remove-orphans

echo "==> Container status:"
$COMPOSE ps

echo "==> Seeding service catalog (idempotent — safe on every deploy)..."
$COMPOSE run --rm migrate npx prisma db seed

echo "==> Deploy complete."
