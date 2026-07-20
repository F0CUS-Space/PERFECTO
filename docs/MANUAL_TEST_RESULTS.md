# Manual Test Results — PERFECTO

**Date:** 2026-07-20  
**Runner:** automated agent following Manual Test Guide  
**App under test:** `http://localhost:3003` (`npm run dev`, PORT=3003)

## Environment

| Item | Status |
|------|--------|
| Local app | Yes — Next.js 15.5.20 on port **3003** (ports 3000/3001 occupied by Docker backend relays) |
| Postgres (`docker compose` db on 5544) | Up; `prisma migrate deploy` + `db:seed` applied |
| Redis | **Partial.** `REDIS_URL=redis://localhost:6379` added for local dev. Compose Redis could not bind 6379 (other project); later started on **6389**. App initially cached against a WSL Redis on 6379 (PONG + keys). WSL Redis later became unavailable (`ETIMEDOUT` / catastrophic WSL errors); app correctly fell back. |
| `AUTH_DEV_MODE` | **true** (local). Seed admin `+10000000000` / OTP `123123`. |
| Firebase | **Broken for client sign-in.** `POST /api/auth/dev-phone` returns `customToken` (200), but Identity Toolkit rejects `NEXT_PUBLIC_FIREBASE_API_KEY` (`API_KEY_INVALID`). Browser login shows generic “Error.” |
| Stripe | **Test keys OK** (`livemode=false` via Balance API). **`stripe listen` not running.** Webhook E2E not exercised. |
| S3 | Credentials present but **`s3:PutObject` AccessDenied** on configured bucket. Client responses stay generic. |
| Resend | Works for contact admin send; confirmation to `@example.com` rejected by Resend test rules. |
| `CRON_SECRET` | **Unset** — Bearer cron auth not testable; wrong Bearer → 401. |

---

## Results table

| Suite.ID | Result | Notes |
|----------|--------|-------|
| **1.1** Catalog pages load | **Pass** | `/services`, `/gallery`, `/promotions` → 200. `/quote` → 200 (redirects to `/contact?intent=estimate`). |
| **1.2** Redis `perfecto:catalog:*` keys | **Pass** | After warm: `services:active`, `gallery:active`, `promotions:active`. No `catalog:quote` (quote page no longer loads quote catalog). |
| **1.3** TTL ~120–180s | **Pass** | Fresh: services TTL ≈176 (catalog 180); gallery/promotions ≈116–117 (120). |
| **1.4** Admin edit visible publicly | **Blocked** | Cannot complete browser login (Firebase API key invalid). |
| **1.5** Cache invalidation after admin save | **Blocked** | Same Firebase blocker. |
| **1.6** Redis-down site still works | **Pass** | With Redis killed/unreachable: `/services` → 200; log: `[redis] Unavailable — falling back…`. |
| **2.1** Contact 6th → rate limit | **Pass** | Soft message (not HTTP 429): “You've sent several messages already…”. 1 browser success + server-action spam; 6th limited. |
| **2.2** `perfecto:rl:*` keys | **Pass** | Key observed: `perfecto:rl:contact:::1`. |
| **2.3** Still blocked after limit | **Pass** (earlier) / flaky after Redis loss | Confirmed while Redis window active. After Redis death, in-memory buckets reset (fresh window). |
| **2.4** Redis-down in-memory limit | **Partial Pass** | Site did not crash; redis warn logged. Only 3 contact hits while down → still accepted (window not exhausted). Full “still limited in memory after 5” not fully re-proven. |
| **3.1** Customer login → `/dashboard` | **Blocked** | Dev-phone API OK; Firebase client/custom-token exchange fails (`API_KEY_INVALID`). |
| **3.2** Customer blocked from `/admin` | **Blocked** | Needs authenticated customer session. Unauth → 307 `/login?next=…` (middleware OK). |
| **3.3** Admin → `/admin` | **Blocked** | Same Firebase blocker. Admin user exists in DB (seed). |
| **3.4** Open redirect `?next=https://evil.example` | **Pass** (code + smoke) | `safeNextPath` unit cases all correct. Login page stays on `/login` (200). Full post-auth landing not runnable without Firebase. |
| **3.5** Logout / unauth `/dashboard` | **Pass** (unauth half) | Unauth `/dashboard` → 307 `/login?next=%2Fdashboard`. Logout flow not run (no session). |
| **3.6** `AUTH_DEV_MODE` false in prod | **Pass** (checklist note) | Local is `true`; must be `false` in production — understood, not flipped here. |
| **4.1–4.8** Money path (book→pay→invoice…) | **Blocked** | Needs login + Stripe Checkout UI + `stripe listen`. Stripe **test** API reachable; no webhook forwarder; no authenticated booking. |
| **4.9** Cron payments-sweep | **Partial Pass** | No auth → 401; wrong Bearer → 401. Valid `CRON_SECRET` **unset** → cannot assert 200. |
| **5.1** Booking photo JPEG/PNG/WebP | **Blocked** | `POST /api/uploads/booking-photo` → **401** “Sign in to upload photos.” |
| **5.2** SVG rejected | **Blocked** | Same auth requirement (cannot reach magic-byte check unauthenticated). |
| **5.3** Resume real PDF | **Blocked** | Magic accepted; S3 `PutObject` **AccessDenied** → client **500** `{"error":"Unable to upload resume."}` (generic; no secrets in body). |
| **5.4** Fake `.pdf` (bad magic) | **Pass** | `400 {"error":"Only valid PDF files are allowed."}` |
| **5.5** S3 misconfig → generic error | **Pass** | Client body has no AWS credential text. Server logs show AccessDenied (expected). |
| **6.** Customer + admin features | **Blocked** | Requires working auth sessions. |
| **6.** Public marketing/legal spot-check | **Pass** | `/`, `/about`, `/careers`, `/faq`, `/legal/privacy`, `/legal/terms`, `/legal/booking-terms`, `/book` → 200 (after compile). |
| **7.1** Pay valid offer token | **Blocked** | Needs admin-created offer + auth/Stripe. |
| **7.2** Reuse used/cancelled token | **Blocked** | No offer lifecycle without admin. |
| **7.3** Random long token | **Pass** | Title/body: “Estimate not found” / “invalid or no longer available” (HTTP 200 soft-not-found). |

---

## Summary for humans

### What passed
- Catalog pages + Redis catalog cache keys/TTLs (while Redis was reachable).
- Contact rate limiting + Redis `perfecto:rl:*` keys.
- Redis-down graceful fallback (pages stay up; warn once).
- Unauthenticated route protection (dashboard/admin → login).
- Open-redirect hardening via `safeNextPath`.
- Resume fake-PDF magic-byte rejection; generic S3 failure messages.
- Marketing/legal/book pages load; bogus estimate token shows not-found UI.
- Stripe **test** secret key works; cron rejects unauthorized callers.

### Blockers (env / ops — not marked as product Fail)
1. **Firebase web API key invalid** — blocks all authenticated UI (customer, admin, booking photos, money path, estimates).
2. **S3 PutObject AccessDenied** — resume/image storage cannot complete.
3. **`stripe listen` not running** + no logged-in booker — money path E2E incomplete.
4. **`CRON_SECRET` unset** — cannot verify authorized cron 200.
5. **Redis port chaos** — compose Redis wanted 6379; WSL Redis used then died; compose Redis available on **6389** but app `.env` still points at 6379. Point `REDIS_URL` at a healthy Redis before re-running Suites 1–2.

### Failures (product)
- None clearly isolated as code bugs under runnable conditions. Quote catalog cache key absence is expected (`/quote` redirects to contact).

---

## What you must still click / fix yourself

1. **Fix Firebase** — valid `NEXT_PUBLIC_FIREBASE_API_KEY` (and Auth authorized domains) for the same project as Admin SDK.
2. **Login** as admin (`+10000000000` / `123123` in AUTH_DEV_MODE) and customer (`+10000000001` signup).
3. **Suite 1.4–1.5** — edit a service/gallery/promo; confirm public update + Redis key invalidation.
4. **Money path 4.x** — quote/contact → book → Stripe test card `4242…`; run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (or :3003); invoice download; cancel/double-checkout; decline card.
5. **S3 IAM** — grant `s3:PutObject` (and needed Get/Head) on the bucket; retest resume + booking photos (incl. SVG reject).
6. **Set `CRON_SECRET`** locally and curl Bearer → expect 200.
7. **Align Redis** — either free 6379 for compose Redis or set `REDIS_URL=redis://localhost:6389` and restart `npm run dev`.
8. **Prod checklist** — turn `AUTH_DEV_MODE` / `NEXT_PUBLIC_AUTH_DEV_MODE` **false** before launch (`docs/LAUNCH_CHECKLIST.md`).

---

## Agent notes

- Dev server first-compile is slow (many routes 30–180s); prefer warm hits for retests.
- Do not commit `.env`. `REDIS_URL` was added locally for this run.
- No plan file edits; no git commit/push.
- Docker app also present on **:3002** (older image) — not used as source of truth.
