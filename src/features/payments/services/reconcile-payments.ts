import "server-only";

import type Stripe from "stripe";

import { env } from "@/env";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { Booking, Invoice, Payment, Prisma } from "@prisma/client";

import { netCapturedFromPayments } from "@/features/payments/booking-amount-paid";
import { generateInvoiceNumber } from "./invoice";
import { OUTBOX_EVENT, drainOutbox, enqueueOutboxEvent } from "./outbox";

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

function sessionAmountCents(session: Stripe.Checkout.Session): number {
  return session.amount_total ?? 0;
}

/** Loads every Stripe Checkout session ID we have on file for a booking. */
async function findPaidCheckoutSessions(bookingId: string): Promise<Stripe.Checkout.Session[]> {
  const stripe = getStripe();
  const byId = new Map<string, Stripe.Checkout.Session>();

  const payments = await prisma.payment.findMany({
    where: { bookingId, providerPaymentId: { not: null } },
    select: { providerPaymentId: true },
  });

  for (const payment of payments) {
    if (!payment.providerPaymentId?.startsWith("cs_")) continue;

    try {
      const session = await stripe.checkout.sessions.retrieve(payment.providerPaymentId);
      if (session.metadata?.bookingId === bookingId && session.payment_status === "paid") {
        byId.set(session.id, session);
      }
    } catch {
      // Session may have been deleted or is invalid — ignore.
    }
  }

  return [...byId.values()];
}

async function recordPaidSession(
  tx: Prisma.TransactionClient,
  booking: BookingWithRelations,
  session: Stripe.Checkout.Session,
): Promise<number> {
  const amount = sessionAmountCents(session);
  if (amount <= 0) return 0;

  // Capture the PaymentIntent id here too (not just in the webhook) so refunds work
  // even when confirmation happened via the redirect-path reconcile.
  const paymentIntent = session.payment_intent;
  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : (paymentIntent?.id ?? null);

  const existing = await tx.payment.findFirst({
    where: { provider: "stripe", providerPaymentId: session.id },
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

  // Link this session to the pending attempt row that started it (still unlinked).
  const metadataPaymentId = session.metadata?.paymentId;
  if (metadataPaymentId) {
    const linked = await tx.payment.findUnique({ where: { id: metadataPaymentId } });
    if (linked && linked.status !== "SUCCEEDED" && !linked.providerPaymentId) {
      await tx.payment.update({
        where: { id: metadataPaymentId },
        data: {
          status: "SUCCEEDED",
          providerPaymentId: session.id,
          providerPaymentIntentId: linked.providerPaymentIntentId ?? paymentIntentId,
          amount,
        },
      });
      return amount;
    }
  }

  // Backstop for missed webhooks / duplicate sessions. The @@unique([provider, providerPaymentId])
  // makes this idempotent even under concurrent reconciles (upsert instead of create).
  // V1.0 collects the full amount at booking, so every captured session is a DEPOSIT-type payment.
  await tx.payment.upsert({
    where: {
      provider_providerPaymentId: { provider: "stripe", providerPaymentId: session.id },
    },
    create: {
      bookingId: booking.id,
      type: "DEPOSIT",
      amount,
      status: "SUCCEEDED",
      providerPaymentId: session.id,
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

  let paidSessions: Stripe.Checkout.Session[] = [];
  if (env.STRIPE_SECRET_KEY?.trim()) {
    paidSessions = await findPaidCheckoutSessions(bookingId);
  }

  let didConfirm = false;

  await prisma.$transaction(async (tx) => {
    for (const session of paidSessions) {
      await recordPaidSession(tx, booking, session);
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
