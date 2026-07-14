import "server-only";

import { env } from "@/env";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { Booking, Invoice, Payment, Prisma } from "@prisma/client";

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

  const existing = await tx.payment.findFirst({
    where: { provider: "stripe", providerPaymentId: capture.providerPaymentId },
  });

  if (existing?.status === "SUCCEEDED") {
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

  // Link this capture to the pending attempt row that started it (still unlinked).
  const metadataPaymentId = capture.metadataPaymentId;
  if (metadataPaymentId) {
    const linked = await tx.payment.findUnique({ where: { id: metadataPaymentId } });
    if (linked && linked.status !== "SUCCEEDED" && !linked.providerPaymentId) {
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
    }
  }

  // Backstop for missed webhooks / duplicate captures. The @@unique([provider, providerPaymentId])
  // makes this idempotent even under concurrent reconciles (upsert instead of create).
  // V1.0 collects the full amount at booking, so every captured session is a DEPOSIT-type payment.
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
    update: { status: "SUCCEEDED", amount },
  });

  return amount;
}

/**
 * Reconciles Stripe Checkout sessions with local payment records.
 * Handles missed webhooks, double payments, and duplicate checkout sessions.
 */
export async function reconcileBookingPayments(
  bookingId: string,
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
  const captures = await getPaymentReconciler().findSettledCaptures(bookingId);

  let didConfirm = false;

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

      if (booking.invoice) {
        await tx.invoice.update({
          where: { id: booking.invoice.id },
          data: { amountPaid },
        });
      } else {
        const invoiceNumber = await generateInvoiceNumber(tx);
        await tx.invoice.create({
          data: {
            bookingId,
            number: invoiceNumber,
            amountDue: booking.totalAmount,
            amountPaid,
          },
        });
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
    depositSatisfied: amountPaid >= refreshed.depositAmount,
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

    if (session.status === "expired") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { providerPaymentId: null },
      });
    }
  } catch {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { providerPaymentId: null },
    });
  }

  return null;
}

/** Reuses any in-progress checkout before starting a new one. */
export async function getOpenDepositCheckoutUrlForBooking(
  bookingId: string,
): Promise<string | null> {
  const pending = await prisma.payment.findMany({
    where: {
      bookingId,
      status: "PENDING",
      providerPaymentId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const payment of pending) {
    const url = await getOpenDepositCheckoutUrl(payment.id);
    if (url) return url;
  }

  return null;
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
