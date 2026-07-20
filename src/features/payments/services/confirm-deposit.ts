import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

import type { SettledCapture } from "./payment-reconciler";
import { reconcileBookingPayments } from "./reconcile-payments";

function paymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  return typeof intent === "string" ? intent : intent.id;
}

function amountCentsFromSession(session: Stripe.Checkout.Session): number {
  if (typeof session.amount_total === "number" && session.amount_total > 0) {
    return session.amount_total;
  }
  const intent = session.payment_intent;
  if (typeof intent === "object" && intent && typeof intent.amount_received === "number" && intent.amount_received > 0) {
    return intent.amount_received;
  }
  if (typeof intent === "object" && intent && typeof intent.amount === "number" && intent.amount > 0) {
    return intent.amount;
  }
  return 0;
}

/**
 * Builds a settled capture from a paid Checkout Session (webhook or redirect).
 * Requires payment_status=paid. Accepts sessions with bookingId even when
 * metadata.type is missing (older sessions / partial metadata) so redirect
 * recovery cannot be blocked by a strict type check.
 */
export function settledCaptureFromCheckoutSession(
  session: Stripe.Checkout.Session,
  options: { requireDepositType?: boolean } = {},
): SettledCapture | null {
  if (session.payment_status !== "paid") return null;

  const requireDepositType = options.requireDepositType ?? false;
  if (requireDepositType && session.metadata?.type !== "DEPOSIT") return null;

  // Prefer explicit deposit type, but allow booking-scoped paid sessions without it.
  if (
    session.metadata?.type &&
    session.metadata.type !== "DEPOSIT" &&
    session.metadata.type !== "BOOKING"
  ) {
    return null;
  }

  const amountCents = amountCentsFromSession(session);
  if (amountCents <= 0) {
    console.error(
      "[confirm-deposit] paid session has no usable amount",
      JSON.stringify({ sessionId: session.id, amountTotal: session.amount_total }),
    );
    return null;
  }

  return {
    providerPaymentId: session.id,
    providerPaymentIntentId: paymentIntentIdFromSession(session),
    amountCents,
    metadataPaymentId: session.metadata?.paymentId ?? null,
  };
}

/**
 * Confirms a deposit after Stripe Checkout completes.
 * Side effects (customer email + admin notifications) run inside reconcile when newly confirmed.
 */
export async function confirmDepositFromCheckoutSession(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;

  if (!bookingId) {
    throw new Error("Checkout session missing booking metadata.");
  }

  if (session.metadata?.type && session.metadata.type !== "DEPOSIT" && session.metadata.type !== "BOOKING") {
    return { skipped: true as const, reason: "not_deposit" };
  }

  if (session.payment_status !== "paid") {
    return { skipped: true as const, reason: "payment_not_paid" };
  }

  const before = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, userId: true },
  });

  if (!before) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  // Defense-in-depth: the session's userId metadata must match the booking owner.
  // Prevents a session minted for one account from confirming another's booking.
  const sessionUserId = session.metadata?.userId;
  if (sessionUserId && sessionUserId !== before.userId) {
    console.error(
      "[confirm-deposit] session/booking owner mismatch — refusing to confirm",
      JSON.stringify({ bookingId, sessionId: session.id }),
    );
    return { skipped: true as const, reason: "owner_mismatch" };
  }

  if (before.status === "CANCELLED" || before.status === "REFUNDED") {
    console.error(
      "[confirm-deposit] paid session for terminal booking — recording capture for refund review, not confirming",
      JSON.stringify({ bookingId, sessionId: session.id, status: before.status }),
    );
  }

  const knownCapture = settledCaptureFromCheckoutSession(session);
  if (!knownCapture) {
    console.error(
      "[confirm-deposit] paid session produced no capture",
      JSON.stringify({ bookingId, sessionId: session.id, paymentStatus: session.payment_status }),
    );
  }

  const result = await reconcileBookingPayments(bookingId, {
    knownCaptures: knownCapture ? [knownCapture] : [],
  });

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

/**
 * Redirect-sync helper: load a Checkout Session by id and reconcile it onto the booking.
 * Used when Stripe returns `session_id` on the success URL.
 *
 * This path MUST work even when:
 * - the local Payment row was never linked to the session
 * - the webhook never arrived (missing STRIPE_WEBHOOK_SECRET / delivery failure)
 * - metadata.type is absent on older sessions
 */
export async function reconcileBookingFromCheckoutSessionId(
  bookingId: string,
  sessionId: string,
): Promise<boolean> {
  if (!sessionId.startsWith("cs_")) return false;

  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  const sessionBookingId = session.metadata?.bookingId;
  if (sessionBookingId && sessionBookingId !== bookingId) {
    console.error(
      "[confirm-deposit] redirect session/booking mismatch",
      JSON.stringify({ bookingId, sessionId, sessionBookingId }),
    );
    return false;
  }

  // Refuse to credit a paid session that is not bound to this booking. Fall back
  // to linked-row reconcile only — never apply an unbound capture (payment IDOR).
  if (!sessionBookingId) {
    console.warn(
      "[confirm-deposit] redirect session missing bookingId metadata — not applying capture",
      JSON.stringify({ bookingId, sessionId }),
    );
    const fallback = await reconcileBookingPayments(bookingId);
    return fallback.depositSatisfied;
  }

  const bookingOwner = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true },
  });
  const sessionUserId = session.metadata?.userId;
  if (sessionUserId && bookingOwner && sessionUserId !== bookingOwner.userId) {
    console.error(
      "[confirm-deposit] redirect session/booking owner mismatch",
      JSON.stringify({ bookingId, sessionId }),
    );
    return false;
  }

  if (session.payment_status !== "paid") {
    console.warn(
      "[confirm-deposit] redirect session not paid yet",
      JSON.stringify({ bookingId, sessionId, paymentStatus: session.payment_status }),
    );
    // Still run provider reconcile in case a linked row already shows paid.
    const fallback = await reconcileBookingPayments(bookingId);
    return fallback.depositSatisfied;
  }

  const knownCapture = settledCaptureFromCheckoutSession(session);
  if (!knownCapture) {
    console.error(
      "[confirm-deposit] redirect could not build capture from paid session",
      JSON.stringify({ bookingId, sessionId }),
    );
    const fallback = await reconcileBookingPayments(bookingId);
    return fallback.depositSatisfied;
  }

  const result = await reconcileBookingPayments(bookingId, {
    knownCaptures: [knownCapture],
  });
  await persistPaymentIntentId(session);
  return result.depositSatisfied || result.bookingConfirmed;
}

/** @deprecated Use reconcileBookingPayments — kept for callers during redirect sync. */
export async function syncBookingDepositIfPaid(bookingId: string): Promise<boolean> {
  const result = await reconcileBookingPayments(bookingId);
  return result.depositSatisfied;
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
