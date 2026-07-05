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
WEBROOT="/var/www/certbot"
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

get_public_ip() {
  curl -fsS --max-time 10 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' \
    || curl -fsS --max-time 10 https://ifconfig.me 2>/dev/null | tr -d '[:space:]' \
    || true
}

get_domain_ips() {
  dig +short "${DOMAIN}" A 2>/dev/null | grep -E '^[0-9.]+$' || true
}

echo "==> Domain: ${DOMAIN}"
echo "==> App upstream: 127.0.0.1:${APP_PORT}"

PUBLIC_IP="$(get_public_ip)"
DOMAIN_IPS="$(get_domain_ips)"

if [[ -n "${PUBLIC_IP}" ]]; then
  echo "==> This server's public IP: ${PUBLIC_IP}"
else
  echo "WARNING: Could not detect this server's public IP."
fi

if [[ -n "${DOMAIN_IPS}" ]]; then
  echo "==> DNS A record(s) for ${DOMAIN}:"
  echo "${DOMAIN_IPS}" | sed 's/^/    /'
else
  echo "WARNING: No A record found for ${DOMAIN} (DNS may not be configured yet)."
fi

# GoDaddy parking/forwarding IPs commonly break Let's Encrypt (403 on acme-challenge).
GODADDY_PARKING_HINT="76.223."

if [[ -n "${PUBLIC_IP}" && -n "${DOMAIN_IPS}" ]]; then
  if ! echo "${DOMAIN_IPS}" | grep -qx "${PUBLIC_IP}"; then
    echo ""
    echo "ERROR: ${DOMAIN} does not point to this EC2 instance."
    echo "       DNS resolves to: $(echo "${DOMAIN_IPS}" | tr '\n' ' ')"
    echo "       This server is:  ${PUBLIC_IP}"
    echo ""
    if echo "${DOMAIN_IPS}" | grep -q "^${GODADDY_PARKING_HINT}"; then
      echo "       Looks like GoDaddy parking/forwarding (${GODADDY_PARKING_HINT}*)."
      echo "       Fix in GoDaddy:"
      echo "         1. Domain → DNS → remove Forwarding / parking"
      echo "         2. Add A record @ → ${PUBLIC_IP}"
      echo "         3. Add A record www → ${PUBLIC_IP}"
      echo "         4. Wait 5–30 min, then re-run this script"
    else
      echo "       Update GoDaddy A record @ and www to ${PUBLIC_IP}, wait for propagation, re-run."
    fi
    exit 1
  fi
  echo "==> DNS OK — ${DOMAIN} points to this server."
fi

echo "==> Installing nginx and certbot..."
if command -v apt-get >/dev/null 2>&1; then
  $SUDO apt-get update -y
  $SUDO apt-get install -y nginx certbot python3-certbot-nginx dnsutils curl
elif command -v dnf >/dev/null 2>&1; then
  $SUDO dnf install -y nginx certbot python3-certbot-nginx bind-utils curl
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

echo "==> Writing HTTP nginx config (webroot for Let's Encrypt)..."
$SUDO mkdir -p "${WEBROOT}"
TMP_CONF="/tmp/perfecto-${DOMAIN}.conf"
cat > "${TMP_CONF}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
        default_type "text/plain";
        try_files \$uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

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

# Quick local ACME path test before calling Let's Encrypt.
TEST_FILE="preflight-$(date +%s).txt"
echo "ok" > "/tmp/${TEST_FILE}"
$SUDO mkdir -p "${WEBROOT}/.well-known/acme-challenge"
$SUDO cp "/tmp/${TEST_FILE}" "${WEBROOT}/.well-known/acme-challenge/${TEST_FILE}"
if [[ -n "${PUBLIC_IP}" ]]; then
  HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
    "http://${DOMAIN}/.well-known/acme-challenge/${TEST_FILE}" || echo "000")"
  $SUDO rm -f "${WEBROOT}/.well-known/acme-challenge/${TEST_FILE}"
  if [[ "${HTTP_CODE}" != "200" ]]; then
    echo ""
    echo "ERROR: ACME preflight failed — http://${DOMAIN}/.well-known/acme-challenge/ returned HTTP ${HTTP_CODE}"
    echo "       Expected 200. DNS may still point elsewhere or port 80 is blocked in the security group."
    exit 1
  fi
  echo "==> ACME preflight OK (HTTP 200 on /.well-known/acme-challenge/)"
fi

echo "==> Requesting SSL certificate (webroot — avoids certbot/nginx plugin conflicts)..."
if $SUDO test -d "/etc/letsencrypt/live/${DOMAIN}"; then
  echo "==> Existing certificate found — renewing/expanding..."
  $SUDO certbot certonly --webroot \
    -w "${WEBROOT}" \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    -m "${EMAIL}" \
    --expand \
    --keep-until-expiring
else
  $SUDO certbot certonly --webroot \
    -w "${WEBROOT}" \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    -m "${EMAIL}"
fi

echo "==> Installing HTTPS nginx config..."
FINAL_CONF="${ROOT}/scripts/nginx/perfecto.conf.template"
if [[ ! -f "${FINAL_CONF}" ]]; then
  echo "ERROR: Missing ${FINAL_CONF}"
  exit 1
fi

sed "s|DOMAIN_PLACEHOLDER|${DOMAIN}|g" "${FINAL_CONF}" | $SUDO tee /etc/nginx/sites-available/perfecto >/dev/null
$SUDO nginx -t
$SUDO systemctl reload nginx

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
