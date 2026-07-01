#!/usr/bin/env bash
# One-time EC2 setup — run manually on the server (or via SSH) before the first GitHub deploy.
# Example:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/PERFECTO/main/scripts/ec2-bootstrap.sh | bash
set -euo pipefail

APP_DIR="${EC2_APP_DIR:-${HOME}/PERFECTO}"
SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

echo "==> Installing Docker (if missing)..."
if ! command -v docker >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y ca-certificates curl
    curl -fsSL https://get.docker.com | $SUDO sh
  elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y docker
    $SUDO systemctl enable --now docker
  elif command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y docker
    $SUDO systemctl enable --now docker
  else
    echo "Unsupported OS — install Docker manually, then re-run."
    exit 1
  fi
fi

$SUDO systemctl enable docker 2>/dev/null || true
$SUDO systemctl start docker 2>/dev/null || true

if [[ -n "${SUDO}" ]]; then
  $SUDO usermod -aG docker "$USER" || true
  echo "NOTE: Log out and back in (or run 'newgrp docker') so Docker works without sudo."
fi

echo "==> Creating app directory: ${APP_DIR}"
mkdir -p "${APP_DIR}"

if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo ""
  echo "==> NEXT: Create ${APP_DIR}/.env before deploying"
  echo "    cp .env.example .env   # after first deploy sync, or create manually now"
  echo "    Required: DATABASE_URL (via compose), NEXT_PUBLIC_APP_URL, Firebase, S3_BUCKET_NAME, etc."
  echo "    On EC2 with an IAM role for S3, you can omit AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY."
fi

echo ""
echo "==> Bootstrap complete."
echo "    Set GitHub secrets: EC2_HOST, EC2_USER, EC2_SSH_KEY, EC2_APP_DIR (optional)"
echo "    Open security group ports: 22 (SSH), ${APP_HOST_PORT:-3000} (app)"
echo "    Push to main to trigger deploy."
