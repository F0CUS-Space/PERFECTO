# Launch checklist (ops only)

Code hardening for go-live is done. Complete these in production before opening traffic.

## Environment & secrets

- [ ] `NODE_ENV=production`
- [ ] `AUTH_DEV_MODE=false` and `NEXT_PUBLIC_AUTH_DEV_MODE=false`
- [ ] `NEXT_PUBLIC_APP_URL=https://your-domain` (no trailing slash; matches public HTTPS URL)
- [ ] `DATABASE_URL` points at production Postgres
- [ ] Redis running via Compose (`redis` service); app has `REDIS_URL=redis://redis:6379` (Compose sets this). Rate limits are global across instances via Redis; catalog cache uses the same store.
- [ ] `SESSION_SECRET` (or equivalent session signing secret) is a long random value, not a dev default
- [ ] `CRON_SECRET` set; scheduler calls `GET|POST /api/cron/payments-sweep` with `Authorization: Bearer <CRON_SECRET>`
- [ ] Firebase production project + Authorized domains include your domain
- [ ] Resend: `RESEND_API_KEY` + from-address verified
- [ ] S3: bucket, credentials, and CORS only if browser uploads are used (most uploads are server-side)

## Stripe (live)

- [ ] Live `STRIPE_SECRET_KEY` and matching `STRIPE_WEBHOOK_SECRET`
- [ ] Webhook endpoint: `https://your-domain/api/webhooks/stripe` (or `/api/webhooks/[provider]`) with events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] One test-mode end-to-end book → pay → webhook → invoice before flipping to live keys
- [ ] After live cutover: one small real payment + refund smoke

## HTTPS / DNS / deploy

- [ ] DNS A records → Elastic IP; no GoDaddy parking/forwarding
- [ ] nginx (or equivalent) terminates TLS; app only on localhost
- [ ] Security group: 80/443 (and 22 for deploy); close public :3000 if unused
- [ ] Seed/promote at least one `ADMIN` user
- [ ] Confirm production boot fails closed without Stripe secrets (`startup-checks`)

## Legal / content

- [ ] Counsel review of copy in `src/content/legal.ts` before relying on it
- [ ] Footer / booking wizard legal links resolve on production (`/legal/*`)

## Post-deploy smoke (5 minutes)

- [ ] Login OTP works; customer cannot open `/admin`
- [ ] Quote → book → Stripe Checkout → confirmation shows paid + invoice download (owner only)
- [ ] Cancel unpaid booking; open Checkout URL no longer accepts payment
- [ ] Contact form + careers apply succeed (or soft-fail without leaking infra errors)
