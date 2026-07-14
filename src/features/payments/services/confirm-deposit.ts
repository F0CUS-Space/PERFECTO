import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";

import { reconcileBookingPayments } from "./reconcile-payments";

/**
 * Confirms a deposit after Stripe Checkout completes.
 * Side effects (customer email + admin notifications) run inside reconcile when newly confirmed.
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

  // Persist the PaymentIntent id so later payment_intent/charge webhooks (which do
  // NOT carry the Checkout Session id) can be matched back to this payment row.
  await persistPaymentIntentId(session);

  if (before.status === "CONFIRMED" && !result.newlyConfirmed) {
    return { skipped: true as const, reason: "already_confirmed", result };
  }

  if (result.newlyConfirmed) {
    return { skipped: false as const, bookingId, result };
  }

  return { skipped: true as const, reason: "deposit_not_satisfied", result };
}

/** @deprecated Use reconcileBookingPayments — kept for callers during redirect sync. */
export async function syncBookingDepositIfPaid(bookingId: string): Promise<boolean> {
  const result = await reconcileBookingPayments(bookingId);
  return result.depositSatisfied;
}

function paymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  return typeof intent === "string" ? intent : intent.id;
}

/** Stores the Stripe PaymentIntent id on the payment row linked to this session. */
async function persistPaymentIntentId(session: Stripe.Checkout.Session): Promise<void> {
  const paymentIntentId = paymentIntentIdFromSession(session);
  if (!paymentIntentId) return;

  await prisma.payment.updateMany({
    where: { provider: "stripe", providerPaymentId: session.id, providerPaymentIntentId: null },
    data: { providerPaymentIntentId: paymentIntentId },
  });
}

/**
 * Marks a payment failed when Stripe reports a failed PaymentIntent.
 * Matches on the PaymentIntent id (pi_...), which is what the webhook carries —
 * falls back to the session id for safety.
 */
export async function markDepositFailed(paymentIntentId: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { providerPaymentIntentId: paymentIntentId },
        { providerPaymentId: paymentIntentId },
      ],
    },
  });
  if (!payment || payment.status === "SUCCEEDED") return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED" },
  });
}

/** Marks the attempt failed when a Checkout Session's async payment fails. */
export async function markCheckoutSessionFailed(sessionId: string) {
  const payment = await prisma.payment.findFirst({
    where: { provider: "stripe", providerPaymentId: sessionId },
  });
  if (!payment || payment.status === "SUCCEEDED") return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED" },
  });
}

/**
 * Releases an expired Checkout Session's attempt row so the customer can retry.
 * Clears the session link (leaves it PENDING) so a fresh checkout can reuse the row.
 */
export async function releaseExpiredCheckoutSession(sessionId: string) {
  const payment = await prisma.payment.findFirst({
    where: { provider: "stripe", providerPaymentId: sessionId },
  });
  if (!payment || payment.status === "SUCCEEDED") return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerPaymentId: null, status: "PENDING" },
  });
}
