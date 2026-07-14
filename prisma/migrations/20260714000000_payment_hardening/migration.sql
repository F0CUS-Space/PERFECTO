-- Phase 5: refund audit action
ALTER TYPE "AdminAuditAction" ADD VALUE 'PAYMENT_REFUND';

-- Phase 4: PaymentIntent id so failed/refund webhooks (which reference the
-- PaymentIntent, not the Checkout Session) can be matched to a payment row.
ALTER TABLE "Payment" ADD COLUMN "providerPaymentIntentId" TEXT;

-- Phase 2: prevent duplicate payment rows per provider payment id.
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");

-- Phase 4: index for PaymentIntent lookups.
CREATE INDEX "Payment_providerPaymentIntentId_idx" ON "Payment"("providerPaymentIntentId");

-- Phase 3: atomic per-year invoice sequence.
CREATE TABLE "InvoiceCounter" (
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("year")
);

-- Phase 3: transactional outbox for durable post-commit side effects.
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboxEvent_status_idx" ON "OutboxEvent"("status");

-- CreateIndex
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");

-- Phase 4: webhook idempotency + audit.
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_type_idx" ON "ProcessedWebhookEvent"("type");

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_status_idx" ON "ProcessedWebhookEvent"("status");
