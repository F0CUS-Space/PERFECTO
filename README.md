# Perfecto Cleaning Services

Premium cleaning services platform — **Version 1.0 (Business Launch Platform)**.

Marketing website + phone-first auth + instant quote + online booking + 50% deposit
payments + customer & admin dashboards + recruitment. Built to scale toward V1.5–V3.0.

See [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md), [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md),
and [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for full context.

## Tech Stack

- **Next.js 15** (App Router, RSC) · **TypeScript** · **TailwindCSS** + **shadcn/ui**
- **Prisma** + **PostgreSQL** (self-hosted via Docker)
- **Firebase Auth** (phone OTP; email verification optional)
- **Stripe** (deposit payments) · **AWS S3** (uploads) · **Resend** (email)
- **TanStack Query** + **Zustand** · **React Hook Form** + **Zod**

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # then fill in your keys

# 3. Start PostgreSQL (Docker)
docker compose up -d db

# 4. Apply schema + seed data
npm run prisma:migrate
npm run db:seed

# 5. Run the dev server
npm run dev            # http://localhost:3000
```

## Production (EC2 + Docker)

The entire stack (app + PostgreSQL) runs via Docker Compose on EC2. Deploys are automated
via GitHub Actions on every push to `main`.

### One-time EC2 setup

1. **Security group** — allow inbound:
   - `22` (SSH, for GitHub Actions deploy)
   - `3002` (app — or `80`/`443` if you add a reverse proxy)

2. **Attach IAM role** to the EC2 instance with S3 access (`s3:PutObject`, `s3:GetObject`
   on `arn:aws:s3:::your-bucket/*`). Then you can omit AWS access keys from server `.env`.

3. **Bootstrap Docker** on the instance:
   ```bash
   bash scripts/ec2-bootstrap.sh
   newgrp docker   # or log out/in
   ```

4. **Create server `.env`** at `~/PERFECTO/.env` (or your `EC2_APP_DIR`):
   ```bash
   mkdir -p ~/PERFECTO
   # After first deploy sync, or copy .env.example manually:
   nano ~/PERFECTO/.env
   ```
   Important production values:
   ```env
   NEXT_PUBLIC_APP_URL=http://100.57.92.144:3002
   APP_HOST_PORT=3002
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
| `EC2_APP_PORT` | `3002` | No (smoke check port, default `3002`) |

Workflow: [`.github/workflows/deploy-ec2.yml`](./.github/workflows/deploy-ec2.yml)

- Runs **typecheck + lint** first
- **Rsyncs** code to EC2 (never overwrites server `.env`)
- **`docker compose up -d --build`** on the server

### Manual deploy (without GitHub)

```bash
cp .env.example .env   # fill in production values
docker compose up -d --build
```

App: `http://<EC2_HOST>:3002` (or your `APP_HOST_PORT`).

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
