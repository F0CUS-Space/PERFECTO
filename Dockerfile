# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:22-slim AS base
# OpenSSL is required by Prisma engines.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
# Make npm resilient to slow/flaky networks (avoids ECONNRESET aborts).
ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_factor=2 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=180000 \
    npm_config_fetch_timeout=600000
COPY package.json package-lock.json* ./
# BuildKit cache mount: keeps the npm cache across builds so a retry after a
# network drop resumes from already-downloaded tarballs instead of restarting.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` runs `prisma generate && next build` and emits a standalone server.
RUN npm run build

# ---- Runner (minimal production image) ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma query engine for runtime (client is bundled in standalone output)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Strip Windows CRLF so Linux can exec the script (common on Windows dev machines).
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
