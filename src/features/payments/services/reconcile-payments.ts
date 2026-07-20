import "server-only";

import { env } from "@/env";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { Booking, Invoice, Payment, Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { netCapturedFromPayments } from "@/features/payments/booking-amount-paid";
import { generateInvoiceNumber } from "./invoice";
import { OUTBOX_EVENT, drainOutbox, enqueueOutboxEvent } from "./outbox";
import type { SettledCapture } from "./payment-reconciler";
import { getPaymentReconciler } from "./stripe-reconciler";
import { getPaymentService } from "./stripe-payment-service";

export type PaymentReconcileResult = {
  amountPaid: number;
  amountDue: number;
  depositSatisfied: boolean;
  fullyPaid: boolean;
  bookingConfirmed: boolean;
  newlyConfirmed: boolean;
  /** True when captured payments exceed the booking total (needs admin review / refund). */
  overpaid: boolean;
};

type BookingWithRelations = Booking & {
  payments: Payment[];
  invoice: Invoice | null;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

async function recordSettledCapture(
  tx: Prisma.TransactionClient,
  booking: BookingWithRelations,
  capture: SettledCapture,
): Promise<number> {
  const amount = capture.amountCents;
  if (amount <= 0) return 0;

  // Capture the provider refund id (Stripe PaymentIntent) here too (not just in the
  // webhook) so refunds work even when confirmation happened via the redirect reconcile.
  const paymentIntentId = capture.providerPaymentIntentId;

  // Dedupe by PaymentIntent so a session-based capture and a PI-based orphan recovery
  // never double-count the same Stripe charge.
  if (paymentIntentId) {
    const byIntent = await tx.payment.findFirst({
      where: {
        provider: "stripe",
        providerPaymentIntentId: paymentIntentId,
        status: "SUCCEEDED",
      },
    });
    if (byIntent) {
      return byIntent.amount;
    }
  }

  const existing = await tx.payment.findFirst({
    where: { provider: "stripe", providerPaymentId: capture.providerPaymentId },
  });

  if (existing?.status === "SUCCEEDED") {
    if (paymentIntentId && !existing.providerPaymentIntentId) {
      await tx.payment.update({
        where: { id: existing.id },
        data: { providerPaymentIntentId: paymentIntentId },
      });
    }
    return existing.amount;
  }

  if (existing) {
    await tx.payment.update({
      where: { id: existing.id },
      data: {
        status: "SUCCEEDED",
        amount,
        providerPaymentIntentId: existing.providerPaymentIntentId ?? paymentIntentId,
      },
    });
    return amount;
  }

  // Link this capture to the pending attempt row from metadata when the session was
  // never written to providerPaymentId (or only partially linked).
  const metadataPaymentId = capture.metadataPaymentId;
  if (metadataPaymentId) {
    const linked = await tx.payment.findUnique({ where: { id: metadataPaymentId } });
    if (
      linked &&
      linked.bookingId === booking.id &&
      linked.status !== "SUCCEEDED" &&
      (!linked.providerPaymentId || linked.providerPaymentId === capture.providerPaymentId)
    ) {
      try {
        await tx.payment.update({
          where: { id: metadataPaymentId },
          data: {
            status: "SUCCEEDED",
            providerPaymentId: capture.providerPaymentId,
            providerPaymentIntentId: linked.providerPaymentIntentId ?? paymentIntentId,
            amount,
          },
        });
        return amount;
      } catch (error) {
        // Another row may already own this providerPaymentId — fall through to upsert.
        if (!isUniqueViolation(error)) throw error;
      }
    }
  }

  // Backstop for missed webhooks / duplicate captures. The @@unique([provider, providerPaymentId])
  // makes this idempotent even under concurrent reconciles (upsert instead of create).
  // V1.0 collects the full amount at booking, so every captured session is a DEPOSIT-type payment.
  try {
    await tx.payment.upsert({
      where: {
        provider_providerPaymentId: {
          provider: "stripe",
          providerPaymentId: capture.providerPaymentId,
        },
      },
      create: {
        bookingId: booking.id,
        type: "DEPOSIT",
        amount,
        status: "SUCCEEDED",
        providerPaymentId: capture.providerPaymentId,
        providerPaymentIntentId: paymentIntentId,
      },
      update: {
        status: "SUCCEEDED",
        amount,
        providerPaymentIntentId: paymentIntentId ?? undefined,
      },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Lost a race — the winning writer already stored the capture.
  }

  return amount;
}

async function ensureBookingInvoice(bookingId: string, amountPaid: number, amountDue: number) {
  const existing = await prisma.invoice.findUnique({ where: { bookingId } });
  if (existing) {
    if (existing.amountPaid !== amountPaid) {
      await prisma.invoice.update({
        where: { id: existing.id },
        data: { amountPaid },
      });
    }
    return;
  }

  try {
    const invoiceNumber = await prisma.$transaction((tx) => generateInvoiceNumber(tx));
    await prisma.invoice.create({
      data: {
        bookingId,
        number: invoiceNumber,
        amountDue,
        amountPaid,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // Concurrent confirm created the invoice — just sync amountPaid.
      await prisma.invoice.updateMany({
        where: { bookingId },
        data: { amountPaid },
      });
      return;
    }
    // Invoice must never block payment confirmation.
    console.error("[reconcile] invoice ensure failed", bookingId, error);
  }
}

export type ReconcileBookingPaymentsOptions = {
  /**
   * Captures already known (e.g. from a Stripe webhook payload or redirect
   * `session_id`). Merged with provider lookups so confirmation still works when
   * the local payment row was never linked to the Checkout Session id.
   */
  knownCaptures?: SettledCapture[];
};

/**
 * Reconciles Stripe Checkout sessions with local payment records.
 * Handles missed webhooks, double payments, and duplicate checkout sessions.
 */
export async function reconcileBookingPayments(
  bookingId: string,
  options: ReconcileBookingPaymentsOptions = {},
): Promise<PaymentReconcileResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, invoice: true },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  // Provider-agnostic: the reconciler returns settled captures (empty when the
  // provider isn't configured), keeping the DB/transaction logic below neutral.
  const found = await getPaymentReconciler().findSettledCaptures(bookingId);
  const byId = new Map<string, SettledCapture>();
  for (const capture of found) {
    if (capture.amountCents > 0) {
      byId.set(capture.providerPaymentId, capture);
    }
  }
  for (const capture of options.knownCaptures ?? []) {
    if (capture.amountCents > 0) {
      byId.set(capture.providerPaymentId, capture);
    }
  }
  const captures = [...byId.values()];

  let didConfirm = false;

  // Critical path: record captures + confirm booking. Invoice is best-effort
  // afterwards so a counter/unique race can never roll back a paid confirmation.
  await prisma.$transaction(async (tx) => {
    for (const capture of captures) {
      await recordSettledCapture(tx, booking, capture);
    }

    const payments = await tx.payment.findMany({ where: { bookingId } });
    const amountPaid = Math.min(netCapturedFromPayments(payments), booking.totalAmount);
    const depositSatisfied = amountPaid >= booking.depositAmount;

    if (depositSatisfied) {
      // Optimistic guard: only confirm while still PENDING_PAYMENT so a concurrent
      // admin change (e.g. CANCELLED) is never clobbered.
      const confirmed = await tx.booking.updateMany({
        where: { id: bookingId, status: "PENDING_PAYMENT" },
        data: { status: "CONFIRMED" },
      });
      didConfirm = confirmed.count > 0;

      if (didConfirm) {
        // Durable side-effect intent, committed atomically with the status change.
        await enqueueOutboxEvent(tx, OUTBOX_EVENT.BOOKING_CONFIRMED, { bookingId });
      }
    }
  });

  const refreshed = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, invoice: true },
  });

  if (!refreshed) {
    throw new Error(`Booking ${bookingId} not found after reconcile.`);
  }

  const rawAmountPaid = netCapturedFromPayments(refreshed.payments);
  const amountPaid = Math.min(rawAmountPaid, refreshed.totalAmount);
  const overpaid = rawAmountPaid > refreshed.totalAmount;

  if (overpaid) {
    console.error(
      "[reconcile] OVERPAYMENT detected — needs admin review/refund",
      JSON.stringify({ bookingId, rawAmountPaid, totalAmount: refreshed.totalAmount }),
    );
  }

  const depositSatisfied = amountPaid >= refreshed.depositAmount;
  if (depositSatisfied) {
    await ensureBookingInvoice(bookingId, amountPaid, refreshed.totalAmount);
  }

  const newlyConfirmed = didConfirm;

  if (newlyConfirmed) {
    // Best-effort inline drain so confirmation email/notifications fire promptly.
    // The scheduled outbox sweep is the durability backstop if this fails.
    await drainOutbox().catch((error) => {
      console.error("[reconcile] inline outbox drain failed", bookingId, error);
    });
  }

  return {
    amountPaid,
    amountDue: refreshed.totalAmount,
    depositSatisfied,
    fullyPaid: amountPaid >= refreshed.totalAmount,
    bookingConfirmed: refreshed.status === "CONFIRMED",
    newlyConfirmed,
    overpaid,
  };
}

/** Returns an open Stripe Checkout URL for the deposit if one already exists. */
export async function getOpenDepositCheckoutUrl(paymentId: string): Promise<string | null> {
  if (!env.STRIPE_SECRET_KEY?.trim()) return null;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment?.providerPaymentId?.startsWith("cs_")) return null;

  try {
    const session = await getStripe().checkout.sessions.retrieve(payment.providerPaymentId);

    if (session.status === "open" && session.url) {
      return session.url;
    }

    // Expired unpaid sessions can be unlinked so a fresh checkout can reuse the row.
    // Paid/complete sessions keep providerPaymentId so findSettledCaptures can apply them.
    if (session.status === "expired" && session.payment_status !== "paid") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { providerPaymentId: null },
      });
    }
  } catch (error) {
    // Never unlink on transient Stripe/network errors — clearing providerPaymentId here
    // can mint a second Checkout while the first is still open or already paid.
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "resource_missing") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { providerPaymentId: null },
      });
    } else {
      console.warn(
        "[getOpenDepositCheckoutUrl] retrieve failed — keeping session link",
        payment.providerPaymentId,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return null;
}

export type OpenDepositCheckoutLookup =
  | { status: "open"; url: string }
  | { status: "none" }
  /** A linked session exists but Stripe did not return a reusable open URL (retry later). */
  | { status: "linked_unresolved" };

/** Reuses any in-progress checkout before starting a new one. */
export async function getOpenDepositCheckoutUrlForBooking(
  bookingId: string,
): Promise<string | null> {
  const result = await lookupOpenDepositCheckoutForBooking(bookingId);
  return result.status === "open" ? result.url : null;
}

/**
 * Like {@link getOpenDepositCheckoutUrlForBooking}, but distinguishes "no session"
 * from "session linked but not reusable yet" so callers do not mint a duplicate Checkout.
 */
export async function lookupOpenDepositCheckoutForBooking(
  bookingId: string,
): Promise<OpenDepositCheckoutLookup> {
  const pending = await prisma.payment.findMany({
    where: {
      bookingId,
      status: "PENDING",
      providerPaymentId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  let sawLinkedSession = false;

  for (const payment of pending) {
    if (payment.providerPaymentId?.startsWith("cs_")) {
      sawLinkedSession = true;
    }
    const url = await getOpenDepositCheckoutUrl(payment.id);
    if (url) return { status: "open", url };
  }

  // Re-check: getOpenDepositCheckoutUrl may have cleared expired/missing links.
  if (sawLinkedSession) {
    const stillLinked = await prisma.payment.count({
      where: {
        bookingId,
        status: "PENDING",
        providerPaymentId: { startsWith: "cs_" },
      },
    });
    if (stillLinked > 0) return { status: "linked_unresolved" };
  }

  return { status: "none" };
}

/**
 * Inspects locally linked Checkout Sessions and returns settled captures for any
 * that are already paid. Used by createDepositCheckout before minting a new session.
 */
export async function findPaidCapturesFromLinkedSessions(
  bookingId: string,
): Promise<SettledCapture[]> {
  if (!env.STRIPE_SECRET_KEY?.trim()) return [];

  const payments = await prisma.payment.findMany({
    where: { bookingId, providerPaymentId: { not: null } },
    select: { providerPaymentId: true },
  });

  const stripe = getStripe();
  const captures: SettledCapture[] = [];

  for (const payment of payments) {
    const id = payment.providerPaymentId;
    if (!id?.startsWith("cs_")) continue;
    try {
      const session = await stripe.checkout.sessions.retrieve(id, {
        expand: ["payment_intent"],
      });
      if (session.payment_status !== "paid") continue;
      if (session.metadata?.bookingId && session.metadata.bookingId !== bookingId) continue;

      const paymentIntent = session.payment_intent;
      const intentAmount =
        typeof paymentIntent === "object" && paymentIntent
          ? Number(paymentIntent.amount_received || paymentIntent.amount) || 0
          : 0;
      const amountCents = session.amount_total && session.amount_total > 0
        ? session.amount_total
        : intentAmount;
      if (amountCents <= 0) continue;

      captures.push({
        providerPaymentId: session.id,
        providerPaymentIntentId:
          typeof paymentIntent === "string" ? paymentIntent : (paymentIntent?.id ?? null),
        amountCents,
        metadataPaymentId: session.metadata?.paymentId ?? null,
      });
    } catch {
      // Session may be invalid — ignore.
    }
  }

  return captures;
}

/**
 * Returns a pending payment row for a new checkout attempt.
 * Reuses an existing unlinked PENDING attempt (avoids piling up orphan rows on
 * repeated "Pay now" clicks); only creates a new row when none is reusable.
 */
export async function createDepositCheckoutAttempt(bookingId: string, amount: number) {
  const reusable = await prisma.payment.findFirst({
    where: {
      bookingId,
      type: "DEPOSIT",
      status: "PENDING",
      providerPaymentId: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (reusable) {
    if (reusable.amount === amount) return reusable;
    return prisma.payment.update({
      where: { id: reusable.id },
      data: { amount },
    });
  }

  return prisma.payment.create({
    data: {
      bookingId,
      type: "DEPOSIT",
      amount,
      status: "PENDING",
    },
  });
}

/**
 * Voids every open/pending checkout attempt for a booking: expires the provider
 * session and marks the local attempt FAILED. Unsticks bookings whose checkout is
 * stuck. Returns the number of attempts voided.
 */
export async function voidPendingCheckoutAttempts(bookingId: string): Promise<number> {
  const pending = await prisma.payment.findMany({
    where: { bookingId, status: "PENDING", providerPaymentId: { not: null } },
  });

  const service = getPaymentService();
  let voided = 0;

  for (const payment of pending) {
    if (payment.providerPaymentId?.startsWith("cs_")) {
      await service.voidCheckoutSession(payment.providerPaymentId).catch((error) => {
        console.error(
          "[voidPendingCheckoutAttempts] void failed",
          payment.providerPaymentId,
          error,
        );
      });
    }
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", providerPaymentId: null },
    });
    voided += 1;
  }

  return voided;
}
