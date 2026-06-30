# PERFECTO CLEANING SERVICES

## Implementation Plan (Version 1.0)

> Build target: **Version 1.0 — Business Launch Platform** (estimated 3–4 weeks).
> This plan sequences the work into milestones, defines tasks, and sets the
> Definition of Done for each module. Versions 1.5 / 2.0 / 3.0 are **out of scope** and
> only inform architectural decisions.

---

## 1. Success Definition (Version 1.0)

Version 1.0 is complete when:

**Customer can:** Visit site → Get a quote → Create account → Verify phone → Verify email → Book a service → Pay 50% deposit → Receive confirmation → Manage bookings.

**Admin can:** Receive bookings → Manage customers → Track payments → Review applications → Run the business online.

---

## 2. Guiding Principles

- Build modular, reusable, type-safe, mobile-first, accessible, production-ready code.
- Ship vertically: each milestone produces a working, demoable slice.
- Recompute money/totals on the server; never trust the client.
- No future-version features. Keep architecture scalable per `SYSTEM_ARCHITECTURE.md`.

---

## 3. Milestone Overview

| # | Milestone | Outcome | Est. |
| --- | --- | --- | --- |
| M0 | Project foundation & design system | App boots, brand UI, DB, CI | 2–3 days |
| M1 | Marketing website | All public pages live | 4–5 days |
| M2 | Authentication (phone-first) | Account creation + verification | 3–4 days |
| M3 | Quote calculator | Instant pricing engine | 2 days |
| M4 | Booking system | Multi-step booking + agreements + uploads | 4–5 days |
| M5 | Payments (deposit) | Stripe deposit + confirmation | 3 days |
| M6 | Customer dashboard | Bookings, invoices, payments, profile | 2–3 days |
| M7 | Admin dashboard | Manage bookings/customers/payments/services | 3–4 days |
| M8 | Recruitment system | Apply + admin review + hiring emails | 2–3 days |
| M9 | Notifications, legal, QA, launch | Emails, legal pages, hardening, deploy | 3–4 days |

> Total aligns with the 3–4 week window (parallelizable where teams allow).

---

## 4. Milestone Details

### M0 — Project Foundation & Design System
**Tasks**
- Initialize Next.js 15 + TypeScript (strict), Tailwind, ESLint/Prettier, Husky.
- Install & configure shadcn/ui; define brand tokens (blue/green/white) in Tailwind + CSS variables.
- Set up Prisma + PostgreSQL; create initial `schema.prisma` (all v1.0 models from architecture doc).
- Create `.env.example`; wire `lib/prisma.ts`, base `lib/` adapters (stubs for firebase/stripe/s3/email).
- Build shared layout primitives: `Header`, `Footer`, `Container`, `Button`, `Card`, `Badge`, `Stepper`.
- Set up TanStack Query provider + Zustand store scaffolding.
- CI: typecheck + lint + test on PR.

**Definition of Done**
- App runs locally; `prisma migrate` succeeds; brand theme renders; CI green.

---

### M1 — Marketing Website
**Pages**: Home, About, Services overview, Individual Service pages (`/services/[slug]`), Gallery, Testimonials, FAQ, Promotions, Contact, Careers.

**Tasks**
- Build responsive sections per design screenshots (hero, service grid, trust badges, testimonials, FAQ accordion, CTA banners).
- Seed `Service`, `Testimonial`, `Promotion` data.
- Contact form → `ContactMessage` (Server Action + Zod + email to admin).
- SEO: metadata, Open Graph, sitemap, semantic headings.
- Careers page links to recruitment apply flow (M8).

**Definition of Done**
- All pages responsive, accessible (AA), navigable; contact form persists + notifies.

---

### M2 — Authentication (Phone-First)
**Tasks**
- Integrate Firebase Auth (client SDK + Admin SDK on server).
- Phone registration → SMS OTP → verify → create/upsert `User` (`phoneVerified`).
- Collect email → send verification → `emailVerified` → account complete.
- Session cookie (HTTP-only) issued/verified server-side; middleware route guards.
- RBAC helpers (`requireUser`, `requireAdmin`) in `src/server`.
- Login for returning users; logout.

**Definition of Done**
- New user completes phone+email verification; protected routes blocked when unauthenticated; admin role gating works.

---

### M3 — Quote Calculator
**Tasks**
- Build deterministic `calculateQuote()` engine + `pricing.ts` config.
- Shared Zod schema (service, bedrooms, bathrooms, size, pets, frequency, add-ons).
- Interactive UI (`/quote`) with live total (matches design "Customize Your Clean" + estimated total card).
- "Continue to booking" pre-fills booking wizard (Zustand handoff).

**Definition of Done**
- Quote updates instantly; server recomputes identical total; feeds into booking.

---

### M4 — Booking System
**Tasks**
- Multi-step wizard (`/book`): Service & quote → Property info + photo upload → Schedule (date + arrival window) → Access/notes → Agreements + e-signature → Review.
- S3 presigned upload endpoint for property photos; preview thumbnails.
- Arrival window selection UI (per "Schedule" screenshot) + booking summary sidebar.
- Agreements step: accept T&C / cancellation / liability + typed e-signature → persist `Agreement` (timestamp + IP). Block progress until accepted.
- `createBooking` Server Action: validate, snapshot quote, compute deposit (50%) + balance, status `PENDING`.

**Definition of Done**
- Booking persists with photos, agreement, totals; cannot reach payment without signed agreement.

---

### M5 — Payments (50% Deposit)
**Tasks**
- Stripe integration behind `PaymentService` interface; create PaymentIntent for deposit.
- Checkout/payment UI as final booking step.
- Webhook (`api/webhooks/stripe`) with signature verification → mark `Payment` SUCCEEDED + `Booking` CONFIRMED.
- Generate invoice number; record `balanceAmount`.
- Trigger booking + payment confirmation emails (M9 templates).

**Definition of Done**
- Successful deposit confirms booking via webhook (not client redirect); failed/abandoned payments leave booking PENDING.

---

### M6 — Customer Dashboard
**Tasks**
- Protected dashboard (per "Homeowner's Portal" screenshot): upcoming + past bookings, statuses.
- Payment history + downloadable invoices.
- Profile management (name, email, phone — re-verify on change).
- TanStack Query data fetching with ownership checks.

**Definition of Done**
- Customer sees only their data; invoices downloadable; profile edits persist.

---

### M7 — Admin Dashboard
**Tasks**
- Admin area (`/admin`, role-gated): bookings list + detail, update `BookingStatus`.
- Customer management (view/search), payment tracking, service CRUD (name/price/active).
- View property photos & agreement details per booking (presigned reads).

**Definition of Done**
- Admin can manage bookings/customers/payments/services and view uploaded photos; non-admins blocked.

---

### M8 — Recruitment System
**Tasks**
- Public application form (Careers): details + resume upload (S3) → `JobApplication` (SUBMITTED).
- "Application received" email to applicant + admin notification.
- Admin: list applications, update `ApplicationStatus`, send acceptance/rejection emails.

**Definition of Done**
- Applicant applies with resume; admin reviews and emails decision.

---

### M9 — Notifications, Legal, QA & Launch
**Tasks**
- Implement `EmailService` templates: verification, booking confirmation, payment confirmation, application received, hiring/rejection.
- Legal pages: Terms & Conditions, Privacy Policy, Cancellation Policy, Liability Policy, Refund Policy.
- Cross-flow QA (Playwright e2e for the critical success path); accessibility + responsive audit.
- Security hardening (authz checks, webhook verification, secrets review).
- Production deploy (Vercel + managed Postgres), env config, monitoring (Sentry), smoke test.

**Definition of Done**
- Full success path passes end-to-end in production; all emails deliver; legal pages live.

---

## 5. Critical Path (End-to-End Flow)

```
M0 → M2 (auth) → M3 (quote) → M4 (booking) → M5 (payment) → M6 (dashboard)
                                                  └→ M9 (confirmation emails)
M1 (marketing) and M8 (recruitment) can run in parallel after M0/M2.
M7 (admin) depends on M4/M5 data.
```

---

## 6. Cross-Cutting Tasks (Every Milestone)

- Zod schema for each input; server-side validation everywhere.
- Loading / empty / error states for each screen.
- Mobile-first responsive + AA accessibility.
- Unit tests for services (pricing, booking totals, authz); e2e for key flows.
- No secrets in code; update `.env.example` when adding config.

---

## 7. Seed & Test Data

- Services (Residential, Deep Clean, Move In/Out, Office, Recurring) with base prices + images.
- Add-ons, sample testimonials, a promotion, an admin user.
- Stripe test mode; Firebase test phone numbers; S3 dev bucket.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Firebase phone OTP cost/limits | Use test numbers in dev; rate-limit; monitor quota. |
| Payment race conditions | Treat Stripe webhook as source of truth; idempotent handlers. |
| S3 misconfiguration / public leaks | Private buckets + presigned URLs only; verify policies. |
| Scope creep into v1.5+ | Enforce "v1.0 only" rule in PR review. |
| Client/server price mismatch | Single shared pricing engine; server recompute authoritative. |

---

## 9. Definition of Done (Version 1.0 Release)

- [ ] All M0–M9 milestone DoDs met.
- [ ] Customer success path works in production end-to-end.
- [ ] Admin can run daily operations (bookings, customers, payments, applications).
- [ ] All transactional emails delivered; SMS OTP working.
- [ ] Legal pages published; agreement acceptance recorded.
- [ ] Accessibility (AA) + responsive verified; CI green; monitoring active.
- [ ] No future-version (1.5/2.0/3.0) features shipped.

---

## 10. Suggested Build Order (Day-by-Day, ~3–4 weeks)

| Week | Focus |
| --- | --- |
| Week 1 | M0 foundation + M1 marketing site + start M2 auth. |
| Week 2 | Finish M2 auth, M3 quote, M4 booking. |
| Week 3 | M5 payments, M6 customer dashboard, M7 admin dashboard. |
| Week 4 | M8 recruitment, M9 notifications/legal/QA, deploy & launch. |
