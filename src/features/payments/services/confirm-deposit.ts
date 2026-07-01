import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";

import { reconcileBookingPayments } from "./reconcile-payments";

/**
 * Confirms a deposit after Stripe Checkout completes.
 * Delegates to reconcile so duplicate sessions and overpayments stay consistent.
 */
export async function confirmDepositFromCheckoutSession(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;

  if (!bookingId) {
    throw new Error("Checkout session missing booking metadata.");
  }

  if (session.metadata?.type !== "DEPOSIT") {
    return { skipped: true as const, reason: "not_deposit" };
  }

  if (session.payment_status !== "paid") {
    return { skipped: true as const, reason: "payment_not_paid" };
  }

  const before = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true },
  });

  if (!before) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  const result = await reconcileBookingPayments(bookingId);

  if (before.status === "CONFIRMED") {
    return { skipped: true as const, reason: "already_confirmed", result };
  }

  if (result.bookingConfirmed) {
    return { skipped: false as const, bookingId, result };
  }

  return { skipped: true as const, reason: "deposit_not_satisfied", result };
}

/** @deprecated Use reconcileBookingPayments — kept for callers during redirect sync. */
export async function syncBookingDepositIfPaid(bookingId: string): Promise<boolean> {
  const result = await reconcileBookingPayments(bookingId);
  return result.depositSatisfied;
}

/** Marks deposit failed when Stripe reports a failed payment intent. */
export async function markDepositFailed(paymentIntentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: paymentIntentId },
  });
  if (!payment || payment.status === "SUCCEEDED") return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED" },
  });
}
