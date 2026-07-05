#!/usr/bin/env bash
# One-time EC2 setup: nginx reverse proxy + Let's Encrypt SSL for your GoDaddy domain.
#
# Prerequisites:
#   1. GoDaddy DNS A record → this server's public IP (see docs/DEPLOY_DOMAIN.md)
#   2. EC2 security group allows 80, 443 (and 22 for SSH)
#   3. Docker app running on port 3000 (docker compose up -d)
#
# Usage (on EC2):
#   export PERFECTO_DOMAIN=perfecto.example.com
#   export CERTBOT_EMAIL=you@example.com
#   bash scripts/ec2-nginx-setup.sh
#
set -euo pipefail

DOMAIN="${PERFECTO_DOMAIN:-}"
EMAIL="${CERTBOT_EMAIL:-}"
APP_PORT="${APP_HOST_PORT:-3000}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

if [[ -z "${DOMAIN}" ]]; then
  echo "ERROR: Set PERFECTO_DOMAIN (e.g. export PERFECTO_DOMAIN=perfecto.yourdomain.com)"
  exit 1
fi

if [[ -z "${EMAIL}" ]]; then
  echo "ERROR: Set CERTBOT_EMAIL for Let's Encrypt expiry notices"
  exit 1
fi

echo "==> Domain: ${DOMAIN}"
echo "==> App upstream: 127.0.0.1:${APP_PORT}"

echo "==> Installing nginx and certbot..."
if command -v apt-get >/dev/null 2>&1; then
  $SUDO apt-get update -y
  $SUDO apt-get install -y nginx certbot python3-certbot-nginx
elif command -v dnf >/dev/null 2>&1; then
  $SUDO dnf install -y nginx certbot python3-certbot-nginx
  $SUDO systemctl enable nginx
else
  echo "ERROR: Unsupported OS (need apt or dnf)."
  exit 1
fi

echo "==> Checking app responds on 127.0.0.1:${APP_PORT}..."
if ! curl -fsS --max-time 10 "http://127.0.0.1:${APP_PORT}/" >/dev/null; then
  echo "WARNING: App not responding on port ${APP_PORT}. Start Docker first:"
  echo "  cd ~/PERFECTO && docker compose up -d"
  echo "Continuing anyway — fix the app before testing HTTPS."
fi

echo "==> Writing temporary HTTP-only nginx config (for certbot)..."
TMP_CONF="/tmp/perfecto-${DOMAIN}.conf"
cat > "${TMP_CONF}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

$SUDO mkdir -p /var/www/html
$SUDO cp "${TMP_CONF}" "/etc/nginx/sites-available/perfecto"
if [[ -d /etc/nginx/sites-enabled ]]; then
  $SUDO ln -sf /etc/nginx/sites-available/perfecto /etc/nginx/sites-enabled/perfecto
  $SUDO rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
elif [[ -d /etc/nginx/conf.d ]]; then
  $SUDO cp "${TMP_CONF}" /etc/nginx/conf.d/perfecto.conf
fi

$SUDO nginx -t
$SUDO systemctl enable nginx
$SUDO systemctl reload nginx

echo "==> Requesting SSL certificate from Let's Encrypt..."
$SUDO certbot --nginx \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  -m "${EMAIL}" \
  --redirect

echo "==> Installing production nginx config from template..."
FINAL_CONF="${ROOT}/scripts/nginx/perfecto.conf.template"
if [[ ! -f "${FINAL_CONF}" ]]; then
  echo "NOTE: Template not found at ${FINAL_CONF} — certbot nginx config is fine as-is."
else
  sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" "${FINAL_CONF}" | $SUDO tee /etc/nginx/sites-available/perfecto >/dev/null
  $SUDO nginx -t
  $SUDO systemctl reload nginx
fi

echo ""
echo "==> Nginx + SSL setup complete."
echo ""
echo "NEXT STEPS:"
echo "  1. Update ~/PERFECTO/.env on the server:"
echo "       NEXT_PUBLIC_APP_URL=https://${DOMAIN}"
echo "  2. Rebuild the app (NEXT_PUBLIC_* is baked at build time):"
echo "       cd ~/PERFECTO && docker compose up -d --build"
echo "  3. Firebase Console → Authentication → Settings → Authorized domains"
echo "       Add: ${DOMAIN}"
echo "  4. Stripe webhook URL: https://${DOMAIN}/api/webhooks/stripe"
echo ""
echo "Test: curl -I https://${DOMAIN}/"
