# Perfecto Cleaning Services

Premium cleaning services platform — **Version 1.0 (Business Launch Platform)**.

Marketing website + phone-first auth + instant quote + online booking + full payment
at booking + customer & admin dashboards + recruitment. Built to scale toward V1.5–V3.0.

See [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md), [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md),
and [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for full context.

## Tech Stack

- **Next.js 15** (App Router, RSC) · **TypeScript** · **TailwindCSS** + **shadcn/ui**
- **Prisma** + **PostgreSQL** (self-hosted via Docker)
- **Redis** (global rate limits + catalog cache via Docker Compose)
- **Firebase Auth** (phone OTP; email verification optional)
- **Stripe** (booking payments) · **AWS S3** (uploads) · **Resend** (email)
- **TanStack Query** + **Zustand** · **React Hook Form** + **Zod**

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # then fill in your keys

# 3. Start PostgreSQL + Redis (Docker)
docker compose up -d db redis

# 4. Apply schema + seed data
npm run prisma:migrate
npm run db:seed

# 5. Run the dev server
npm run dev            # http://localhost:3000
```

Set `REDIS_URL=redis://localhost:6379` in `.env` for local `npm run dev` (Compose publishes
Redis on localhost only). Without Redis, the app still runs: rate limits fall back to
in-memory and catalog caching is skipped. In Compose, the app service uses
`REDIS_URL=redis://redis:6379` for **global** rate limits across instances.

## Production (EC2 + Docker)

The entire stack (app + PostgreSQL + Redis) runs via Docker Compose on EC2. Deploys are automated
via GitHub Actions on every push to `main`.

### One-time EC2 setup

1. **Security group** — allow inbound:
   - `22` (SSH, for GitHub Actions deploy)
   - `80` and `443` (nginx + HTTPS — recommended for production)
   - `3000` (direct app access — optional after nginx is configured)

2. **Attach IAM role** to the EC2 instance with S3 access (`s3:PutObject`, `s3:GetObject`
   on `arn:aws:s3:::your-bucket/*`). Remove `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
   from server `.env` (do not leave them blank).

3. **EC2 metadata hop limit = 2** (required for Docker to use the instance IAM role):
   AWS Console → EC2 → your instance → **Actions → Modify instance metadata options**
   → set **Metadata response hop limit** to **2** → Save, then `docker compose restart app`.

4. **Bootstrap Docker** on the instance:
   ```bash
   bash scripts/ec2-bootstrap.sh
   newgrp docker   # or log out/in
   ```

5. **Create server `.env`** at `~/PERFECTO/.env` (or your `EC2_APP_DIR`):
   ```bash
   mkdir -p ~/PERFECTO
   # After first deploy sync, or copy .env.example manually:
   nano ~/PERFECTO/.env
   ```
   Important production values:
   ```env
   NEXT_PUBLIC_APP_URL=http://100.57.92.144:3000
   APP_HOST_PORT=3000
   S3_BUCKET_NAME=perfecto1
   AWS_REGION=us-east-1
   # Firebase, Stripe, etc. — see .env.example
   ```

### GitHub Actions secrets

In **GitHub → Settings → Secrets and variables → Actions**, add:

| Secret | Example | Required |
|--------|---------|----------|
| `EC2_HOST` | `100.57.92.144` | Yes |
| `EC2_USER` | `ubuntu` or `ec2-user` | Yes |
| `EC2_SSH_KEY` | Full private key (`.pem` contents) | Yes |
| `EC2_APP_DIR` | `/home/ubuntu/PERFECTO` | No (defaults to `/home/{EC2_USER}/PERFECTO`) |
| `EC2_APP_PORT` | `3000` | No (smoke check port, default `3000`) |

Workflow: [`.github/workflows/deploy-ec2.yml`](./.github/workflows/deploy-ec2.yml)

- Runs **typecheck + lint** first
- **Rsyncs** code to EC2 (never overwrites server `.env`)
- **`docker compose up -d --build`** on the server

### Manual deploy (without GitHub)

```bash
cp .env.example .env   # fill in production values
docker compose up -d --build
```

App: `http://<EC2_HOST>:3000` (or your `APP_HOST_PORT`).

**Custom domain (GoDaddy + nginx + HTTPS + Firebase):** see [`docs/DEPLOY_DOMAIN.md`](./docs/DEPLOY_DOMAIN.md).

### Contact form (Resend)

Add to server `.env`:

```env
RESEND_API_KEY=re_...
EMAIL_FROM="Perfecto <onboarding@resend.dev>"
CONTACT_INBOX=inf0@perfectodmv.com
```

- Get an API key at [resend.com](https://resend.com).
- Until your domain is verified, use `onboarding@resend.dev` as the sender.
- Submissions go to `CONTACT_INBOX` (default: `inf0@perfectodmv.com`).
- At go-live, verify your domain in Resend and set `EMAIL_FROM` to your business address.

### Stripe (M5 — booking payments)

Add to server `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Webhook endpoint (after deploy): `https://your-domain/api/webhooks/stripe`

For local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

Booking confirmation is driven by the **webhook**, not the Stripe redirect alone.

## Project Structure

```
src/
  app/              App Router routes (marketing, auth, quote, book, portal, admin, api)
  features/         Feature modules (auth, quote, booking, payments, admin, recruitment...)
  components/       Shared UI (shadcn/ui + brand components)
  lib/              External clients (prisma, firebase, stripe, s3, email, sms)
  server/           Server-only auth/session + RBAC
  env.ts            Type-safe environment access
prisma/             schema.prisma + seed.ts
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run prisma:migrate` | Create/apply dev migration |
| `npm run db:seed` | Seed services, add-ons, admin |
