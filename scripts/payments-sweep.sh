#!/usr/bin/env bash
# Trigger the scheduled payments-maintenance pass (reconcile stuck bookings +
# drain the outbox). Intended to be run periodically (e.g. every few minutes)
# from cron/systemd-timer as the durability backstop for missed Stripe webhooks.
#
# Usage:
#   APP_URL=https://app.example.com CRON_SECRET=xxxx bash scripts/payments-sweep.sh
#
# Env:
#   APP_URL      Base URL of the running app (default: http://localhost:3000)
#   CRON_SECRET  Shared secret; must match the app's CRON_SECRET (required)
#
# Example crontab entry (every 5 minutes):
#   */5 * * * * APP_URL=https://app.example.com CRON_SECRET=xxxx /path/to/scripts/payments-sweep.sh >> /var/log/payments-sweep.log 2>&1
set -euo pipefail

APP_URL="${APP_URL:-http://localhost:3000}"

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET must be set" >&2
  exit 1
fi

curl -fsS -X POST "${APP_URL%/}/api/cron/payments-sweep" \
  -H "Authorization: Bearer ${CRON_SECRET}"
echo
