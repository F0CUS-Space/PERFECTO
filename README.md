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

The entire stack (app + PostgreSQL) runs via Docker Compose. The app image uses the
Next.js standalone output and runs `prisma migrate deploy` on startup.

```bash
cp .env.example .env   # fill in production values
docker compose up -d --build
```

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
