# PERFECTO CLEANING SERVICES

## System Architecture (Version 1.0)

> This document defines the technical architecture for **Version 1.0 — Business Launch Platform**.
> It is intentionally designed to be **scalable**: future versions (1.5, 2.0, 3.0) can be layered on
> without major refactoring. Only Version 1.0 modules are built now; later versions inform structural
> decisions only.

---

## 1. Architectural Goals


| Goal                   | How the architecture supports it                                                |
| ---------------------- | ------------------------------------------------------------------------------- |
| **Fast launch**        | Single Next.js full-stack app (no separate backend service to deploy/host).     |
| **Scalability**        | Feature-based modular structure; clean separation of UI / domain / data layers. |
| **Type safety**        | TypeScript end-to-end + Zod validation + Prisma generated types.                |
| **Trust & conversion** | Premium UI system (blue/green/white), accessible, mobile-first.                 |
| **Maintainability**    | Clear boundaries, no duplication, reusable primitives.                          |
| **Future expansion**   | Schema, auth, and folder structure already account for v1.5–v3.0 concepts.      |


---

## 2. Technology Stack

### Frontend

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript** (strict mode)
- **TailwindCSS** (design tokens for brand palette)
- **shadcn/ui** (Radix-based accessible components)
- **lucide-react** (icons)
- **Framer Motion** (subtle premium animations)

### Backend (within Next.js)

- **Route Handlers** (`app/api/`*) — webhooks, file uploads, third-party callbacks
- **Server Actions** — primary mutation layer for forms (booking, quote, applications)

### Data

- **PostgreSQL** — primary relational database
- **Prisma ORM** — schema, migrations, type-safe queries

### Authentication

- **Firebase Authentication** — phone (OTP via SMS) + email verification
- Phone number is the **primary identifier**

### Storage

- **AWS S3** — property photos, resumes, signed agreement PDFs (private buckets + presigned URLs)

### Payments

- **Stripe** — 50% deposit collection, payment intents, webhooks (recommended; swappable behind a payment service interface)

### Email & SMS

- **Transactional email** — Resend for booking/payment/recruitment emails
- **SMS OTP** — handled by Firebase Phone Auth

### Validation & Forms

- **Zod** — shared schemas (client + server)
- **React Hook Form** — form state and UX

### Client State / Data Fetching

- **TanStack Query** — server state caching for dashboard data
- **Zustand** — lightweight client state (multi-step booking wizard, quote calculator)

### Tooling

- **ESLint + Prettier**, **Vitest** (unit), **Playwright** (e2e, key flows), **Husky** (pre-commit)

---

## 3. High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                          │
│   Marketing pages · Quote calculator · Booking wizard · Dashboards  │
│        Next.js RSC + Client Components · TanStack Query · Zustand    │
└───────────────┬───────────────────────────────┬────────────────────┘
                │ Server Actions                 │ HTTPS / fetch
                ▼                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js 15 Application Server                  │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │ Server     │  │ Route        │  │ Domain / Service layer     │  │
│  │ Actions    │  │ Handlers     │  │ (booking, quote, payment,  │  │
│  │ (mutations)│  │ (api/webhooks│  │  auth, recruitment, email) │  │
│  └─────┬──────┘  └──────┬───────┘  └─────────────┬─────────────┘  │
│        └────────────────┴────────────────────────┘                │
│                         │ Prisma Client                            │
└─────────────────────────┼──────────────────────────────────────────┘
                          ▼
        ┌─────────────────────────────┐
        │        PostgreSQL           │
        └─────────────────────────────┘

  External services:
  ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐
  │  Firebase   │ │ Stripe   │ │  AWS S3  │ │ Email (Resend/  │
  │  Auth (OTP) │ │ Payments │ │ Storage  │ │ SendGrid)       │
  └─────────────┘ └──────────┘ └──────────┘ └─────────────────┘
```

---

## 4. Application Layers (Clean Architecture)

1. **Presentation layer** — React Server/Client Components, pages, UI primitives.
2. **Application layer** — Server Actions + Route Handlers: orchestrate use cases, validate input (Zod), authorize.
3. **Domain/Service layer** — business logic grouped by feature (e.g. `pricing`, `booking`, `payment`, `recruitment`). Framework-agnostic where possible.
4. **Data access layer** — Prisma repositories/queries. Single source of DB access.
5. **Infrastructure layer** — adapters for Firebase, Stripe, S3, Email. Each exposed via a thin interface so providers can be swapped.

> Rule: UI never talks to Prisma or external SDKs directly. It calls Server Actions → services → infrastructure/data.

---

## 5. Folder Structure (Feature-Based)

```
perfecto/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ public/                     # static assets, brand imagery
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/          # public website (route group)
│  │  │  ├─ page.tsx           # Home
│  │  │  ├─ about/
│  │  │  ├─ services/
│  │  │  │  ├─ page.tsx        # services overview
│  │  │  │  └─ [slug]/         # individual service pages
│  │  │  ├─ gallery/
│  │  │  ├─ testimonials/
│  │  │  ├─ faq/
│  │  │  ├─ promotions/
│  │  │  ├─ contact/
│  │  │  └─ careers/
│  │  ├─ (auth)/               # phone/email auth flow
│  │  │  ├─ login/
│  │  │  ├─ register/
│  │  │  └─ verify/
│  │  ├─ quote/                # instant quote calculator
│  │  ├─ book/                 # multi-step booking wizard
│  │  ├─ (dashboard)/          # customer portal (protected)
│  │  │  ├─ dashboard/
│  │  │  ├─ bookings/
│  │  │  ├─ payments/
│  │  │  └─ profile/
│  │  ├─ admin/                # admin dashboard (role-protected)
│  │  │  ├─ bookings/
│  │  │  ├─ customers/
│  │  │  ├─ payments/
│  │  │  ├─ services/
│  │  │  └─ applications/
│  │  ├─ legal/                # T&C, privacy, cancellation, liability, refund
│  │  └─ api/
│  │     ├─ webhooks/stripe/
│  │     ├─ uploads/           # S3 presign
│  │     └─ ...
│  ├─ features/                # feature modules (domain + UI)
│  │  ├─ auth/
│  │  ├─ quote/
│  │  ├─ booking/
│  │  ├─ payments/
│  │  ├─ dashboard/
│  │  ├─ admin/
│  │  ├─ recruitment/
│  │  └─ marketing/
│  │     └─ {components, server (actions), services, schemas, hooks, types}
│  ├─ components/              # shared UI (shadcn + brand primitives)
│  │  └─ ui/
│  ├─ lib/                     # infrastructure adapters & utils
│  │  ├─ prisma.ts
│  │  ├─ firebase/
│  │  ├─ stripe/
│  │  ├─ s3/
│  │  ├─ email/
│  │  └─ utils.ts
│  ├─ server/                  # auth/session helpers, guards, RBAC
│  ├─ config/                  # site config, pricing config, nav
│  └─ styles/                  # globals.css, tailwind tokens
├─ .env.example
└─ ...
```

Each `features/<name>/` folder is self-contained:

```
features/booking/
├─ components/      # wizard steps, summary, uploaders
├─ server/          # server actions (createBooking, confirmBooking)
├─ services/        # business logic (availability, agreement, totals)
├─ schemas/         # Zod schemas shared client+server
├─ hooks/           # TanStack Query / Zustand store
└─ types.ts
```

---

## 6. Data Model (Prisma — Version 1.0)

> Tables marked **(future-ready)** include columns/relations that anticipate v1.5–v3.0 but are
> only populated/used by v1.0 logic where relevant. No future-version business logic is implemented.

### Core entities

```prisma
// ---------- Users & Auth ----------
model User {
  id            String   @id @default(cuid())
  phone         String   @unique          // primary identifier
  phoneVerified Boolean  @default(false)
  email         String?  @unique
  emailVerified Boolean  @default(false)
  firstName     String?
  lastName      String?
  firebaseUid   String?  @unique
  role          Role     @default(CUSTOMER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  bookings      Booking[]
  payments      Payment[]
  addresses     Address[]   // future-ready (saved addresses = v1.5)
}

enum Role {
  CUSTOMER
  ADMIN
  // CLEANER  // v3.0 — reserved, not used in v1.0
}

// ---------- Services & Pricing ----------
model Service {
  id            String   @id @default(cuid())
  slug          String   @unique
  name          String
  description   String
  basePrice     Decimal
  imageUrl      String?
  active        Boolean  @default(true)
  sortOrder     Int      @default(0)
  bookings      Booking[]
  addOns        AddOn[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model AddOn {
  id         String  @id @default(cuid())
  name       String
  price      Decimal
  service    Service? @relation(fields: [serviceId], references: [id])
  serviceId  String?
  active     Boolean @default(true)
}

// ---------- Bookings ----------
model Booking {
  id              String        @id @default(cuid())
  reference       String        @unique          // human-friendly code
  user            User          @relation(fields: [userId], references: [id])
  userId          String
  service         Service       @relation(fields: [serviceId], references: [id])
  serviceId       String

  // quote snapshot
  bedrooms        Int
  bathrooms       Int
  propertySize    String?
  hasPets         Boolean       @default(false)
  frequency       Frequency     @default(ONE_TIME)
  selectedAddOns  Json          // [{id,name,price}]

  scheduledDate   DateTime
  scheduledWindow String        // e.g. "08:00-11:00"

  // property + access
  addressLine     String
  city            String
  postalCode      String?
  accessInfo      String?
  specialNotes    String?

  estimatedTotal  Decimal
  depositAmount   Decimal       // 50% of total
  balanceAmount   Decimal

  status          BookingStatus @default(PENDING)

  photos          PropertyPhoto[]
  payments        Payment[]
  agreement       Agreement?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum Frequency {
  ONE_TIME
  WEEKLY        // exposed in quote; recurring billing logic is v2.0
  BIWEEKLY
  MONTHLY
}

enum BookingStatus {
  PENDING            // created, awaiting deposit
  CONFIRMED          // deposit paid
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model PropertyPhoto {
  id         String  @id @default(cuid())
  booking    Booking @relation(fields: [bookingId], references: [id])
  bookingId  String
  s3Key      String
  createdAt  DateTime @default(now())
}

// ---------- Agreements (electronic) ----------
model Agreement {
  id              String   @id @default(cuid())
  booking         Booking  @relation(fields: [bookingId], references: [id])
  bookingId       String   @unique
  acceptedTerms   Boolean
  acceptedCancel  Boolean
  acceptedLiability Boolean
  signatureName   String
  signedAt        DateTime @default(now())
  ipAddress       String?
  documentS3Key   String?  // optional rendered PDF
}

// ---------- Payments ----------
model Payment {
  id                String        @id @default(cuid())
  booking           Booking       @relation(fields: [bookingId], references: [id])
  bookingId         String
  user              User          @relation(fields: [userId], references: [id])
  userId            String
  type              PaymentType   @default(DEPOSIT)
  amount            Decimal
  currency          String        @default("usd")
  status            PaymentStatus @default(PENDING)
  stripePaymentId   String?       @unique
  invoiceNumber     String?       @unique
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

enum PaymentType { DEPOSIT BALANCE }
enum PaymentStatus { PENDING SUCCEEDED FAILED REFUNDED }

// ---------- Recruitment ----------
model JobApplication {
  id          String            @id @default(cuid())
  firstName   String
  lastName    String
  email       String
  phone       String
  position    String
  resumeS3Key String
  coverNote   String?
  status      ApplicationStatus @default(SUBMITTED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum ApplicationStatus { SUBMITTED UNDER_REVIEW ACCEPTED REJECTED }

// ---------- Marketing content (admin-light in v1.0) ----------
model Testimonial {
  id        String  @id @default(cuid())
  author    String
  rating    Int
  body      String
  featured  Boolean @default(false)
  approved  Boolean @default(true)
  createdAt DateTime @default(now())
}

model Promotion {
  id        String   @id @default(cuid())
  title     String
  body      String
  active    Boolean  @default(true)
  startsAt  DateTime?
  endsAt    DateTime?
}

model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  phone     String?
  message   String
  createdAt DateTime @default(now())
}

// future-ready, unused logic in v1.0
model Address {
  id        String  @id @default(cuid())
  user      User    @relation(fields: [userId], references: [id])
  userId    String
  line      String
  city      String
  postalCode String?
  isDefault Boolean @default(false)
}
```

---

## 7. Authentication Architecture (Phone-First)

Flow (Firebase Authentication + app DB):

```
1. Enter phone number ──► Firebase sends SMS OTP
2. Enter OTP          ──► Firebase verifies → returns Firebase ID token
3. App verifies token (server) → upsert User (phoneVerified = true)
4. Collect email      ──► send email verification (Firebase/transactional link)
5. Verify email       ──► User.emailVerified = true → Account Created
```

- **Session**: Firebase ID token exchanged for a secure, HTTP-only session cookie (verified server-side on each protected request).
- **RBAC**: `User.role` (`CUSTOMER` / `ADMIN`) drives route guards in `src/server/guards`. Admin routes (`/admin/`*) require `ADMIN`.
- **Protected routes**: middleware + per-action authorization checks (defense in depth).
- Phone is the unique key; email is secondary but required to complete the account.

---

## 8. Booking & Payment Flow

```
Quote (optional) ──► Booking wizard
   Step 1: Service & quote details
   Step 2: Property info + photo upload (S3 presigned)
   Step 3: Schedule (date + arrival window)
   Step 4: Access info & special notes
   Step 5: Agreements (T&C / cancellation / liability) + e-signature
   Step 6: Payment (Stripe, full amount)
        │
        ▼
   Stripe PaymentIntent ──► success ──► webhook (api/webhooks/stripe)
        │
        ▼
   Booking.status = CONFIRMED, Payment.status = SUCCEEDED
   ──► Confirmation email + invoice
```

- **Source of truth for confirmation** is the Stripe **webhook**, not the client redirect.
- V1.0 collects the full amount at booking: `depositAmount = estimatedTotal` and `balanceAmount = 0`. The `depositAmount` field name is retained for schema stability; the UI still labels this the "deposit".
- Agreement must be accepted + signed **before** payment step is reachable.

---

## 9. Pricing / Quote Engine

- Pure, deterministic function in `features/quote/services/pricing.ts`:
`calculateQuote(input) → { base, addOnsTotal, frequencyModifier, estimatedTotal, deposit }`
- Driven by config (`src/config/pricing.ts`) + `Service.basePrice` so prices change without code edits.
- Shared Zod schema validates input on both client (instant UI) and server (authoritative).
- Same engine reused by the quote calculator and the booking wizard (no duplication).

---

## 10. File Storage (AWS S3)

- Private buckets; uploads via **presigned URLs** (`api/uploads`).
- Object keys namespaced: `bookings/{bookingId}/photos/...`, `applications/{appId}/resume/...`, `agreements/{bookingId}.pdf`.
- Reads via short-lived presigned GET URLs (no public objects).

---

## 11. Notifications


| Event                          | Channel | Provider                 |
| ------------------------------ | ------- | ------------------------ |
| OTP                            | SMS     | Firebase Phone Auth      |
| Email verification             | Email   | Firebase                 |
| Booking confirmation           | Email   | Resend                   |
| Payment confirmation + invoice | Email   | Resend                   |
| Application received           | Email   | Resend                   |
| Hiring / rejection             | Email   | Resend (admin-triggered) |


- All email sending is behind an `EmailService` interface (`lib/email`) with typed templates.

---

## 12. Design System

- **Palette**: Blue (primary/trust), Green (accent/eco/success), White (space). Soft neutrals for text/surfaces.
- **Tokens** defined in Tailwind config + CSS variables; consumed by shadcn/ui.
- **Characteristics**: generous whitespace, soft shadows, rounded corners (`rounded-xl/2xl`), large readable type, premium imagery.
- **Components**: built on shadcn/ui primitives, wrapped into brand components (`Button`, `Card`, `Badge`, `Stepper`, `PriceCard`).
- **Responsive**: mobile-first; verified at sm/md/lg/xl breakpoints.
- **Accessibility**: semantic HTML, focus states, ARIA via Radix, color-contrast compliant (WCAG AA).

---

## 13. Security & Compliance

- Server-side validation (Zod) on every mutation; never trust client totals — recompute on server.
- HTTP-only secure session cookies; CSRF-safe Server Actions.
- Role-based authorization on all `/admin` and `/dashboard` resources (ownership checks on records).
- Secrets in environment variables only (`.env`), never committed.
- Stripe webhook signature verification.
- PII (phone, email, addresses) access-controlled; S3 objects private.
- Legal pages + recorded agreement acceptance (timestamp + IP) for compliance.

---

## 14. Environment Configuration

```
# Database
DATABASE_URL=

# Firebase (client + admin)
NEXT_PUBLIC_FIREBASE_*=
FIREBASE_ADMIN_*=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AWS S3
AWS_REGION=
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Email
EMAIL_API_KEY=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 15. Scalability Hooks for Future Versions (Not Implemented Now)


| Future version                                          | Architectural seam already present                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| **1.5** Reviews, calendar, promotions                   | `Testimonial`, `Promotion`, `Address` models; admin module structure.   |
| **2.0** Loyalty, memberships, referrals, coupons        | `Frequency` enum + `User`/`Payment` extensible; feature-folder pattern. |
| **3.0** Cleaner portal, commercial, shop, chatbot, i18n | `Role.CLEANER` reserved; route-group structure; provider interfaces.    |


> These are **structural reservations only**. No UI, APIs, or business logic for future versions are built in Version 1.0.

---

## 16. Deployment

- **Hosting**: Vercel (native Next.js 15) — preview + production environments.
- **Database**: managed PostgreSQL (e.g. Neon / Supabase / RDS).
- **CI**: lint + typecheck + tests on PR; Prisma migrate on deploy.
- **Monitoring**: error tracking (Sentry) + Stripe/webhook logs.

