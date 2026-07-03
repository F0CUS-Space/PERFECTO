#!/usr/bin/env bash
# Free disk on EC2 after repeated deploys. Safe by default:
# - Keeps the running app + database containers and their images
# - Keeps the postgres-data volume (only removes *unused* volumes)
#
# Run on the server:
#   bash scripts/ec2-docker-cleanup.sh
#   bash scripts/ec2-docker-cleanup.sh --deep   # also clears apt cache + old system logs
set -euo pipefail

DEEP="${1:-}"

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    echo "docker"
  elif sudo docker info >/dev/null 2>&1; then
    echo "sudo docker"
  else
    echo "ERROR: Docker not available." >&2
    exit 1
  fi
}

DOCKER="$(docker_cmd)"

print_disk() {
  echo "==> Disk usage:"
  df -h / /var/lib/docker 2>/dev/null || df -h /
  echo ""
  $DOCKER system df 2>/dev/null || true
  echo ""
}

print_disk

echo "==> Removing stopped containers (old migrate runs, etc.)..."
$DOCKER container prune -f

echo "==> Removing dangling images..."
$DOCKER image prune -f

echo "==> Removing unused images (keeps images used by running containers)..."
$DOCKER image prune -af

echo "==> Removing build cache from past deploys..."
$DOCKER builder prune -af 2>/dev/null || true

echo "==> Removing unused networks..."
$DOCKER network prune -f

echo "==> Removing unused volumes (postgres-data is kept while db container exists)..."
$DOCKER volume prune -f

if [[ "$DEEP" == "--deep" ]]; then
  echo "==> Deep clean: apt cache..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get clean 2>/dev/null || apt-get clean 2>/dev/null || true
    sudo apt-get autoremove -y 2>/dev/null || apt-get autoremove -y 2>/dev/null || true
  fi

  echo "==> Deep clean: systemd logs older than 7 days..."
  sudo journalctl --vacuum-time=7d 2>/dev/null || true
fi

echo ""
print_disk
echo "==> Cleanup complete."
