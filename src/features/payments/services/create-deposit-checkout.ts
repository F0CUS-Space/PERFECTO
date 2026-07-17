import "server-only";

import type { User } from "@prisma/client";

import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { isStripeConfigured } from "@/lib/stripe-ready";

import {
  reconcileBookingFromCheckoutSessionId,
  settledCaptureFromCheckoutSession,
} from "./confirm-deposit";
import {
  createDepositCheckoutAttempt,
  findPaidCapturesFromLinkedSessions,
  getOpenDepositCheckoutUrlForBooking,
  reconcileBookingPayments,
} from "./reconcile-payments";
import { getPaymentService } from "./stripe-payment-service";

export type CreateDepositCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string; alreadyPaid?: boolean };

/**
 * Core deposit checkout creation. Kept outside `"use server"` so other server
 * modules (e.g. estimate completion) can call it without nesting Server Actions.
 */
export async function createDepositCheckoutForUser(
  bookingId: string,
  user: User,
): Promise<CreateDepositCheckoutResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Payments are not configured on the server." };
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId: user.id },
    include: { service: true },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  // Recover any already-paid linked sessions before minting a new Checkout.
  const paidCaptures = await findPaidCapturesFromLinkedSessions(booking.id);
  const reconcile = await reconcileBookingPayments(booking.id, {
    knownCaptures: paidCaptures,
  });

  if (reconcile.fullyPaid || reconcile.depositSatisfied || reconcile.bookingConfirmed) {
    return {
      ok: false,
      alreadyPaid: true,
      error: "Payment already received for this booking. Refresh the page to see confirmation.",
    };
  }

  if (booking.status === "CONFIRMED") {
    return {
      ok: false,
      alreadyPaid: true,
      error: "This booking is already confirmed.",
    };
  }

  if (booking.status !== "PENDING_PAYMENT") {
    return { ok: false, error: "This booking cannot accept payment in its current state." };
  }

  const existingUrl = await getOpenDepositCheckoutUrlForBooking(booking.id);
  if (existingUrl) {
    return { ok: true, url: existingUrl };
  }

  const attempt = await createDepositCheckoutAttempt(booking.id, booking.depositAmount);

  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  // Stripe replaces {CHECKOUT_SESSION_ID} so redirect reconcile can apply the paid session
  // even if the local payment row was never linked (or the webhook was delayed).
  const successUrl = `${baseUrl}/book/confirmation/${booking.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/book/confirmation/${booking.id}?checkout=cancelled`;

  const paymentService = getPaymentService();

  let url: string;
  let sessionId: string;
  try {
    ({ url, sessionId } = await paymentService.createDepositCheckoutSession({
      bookingId: booking.id,
      paymentId: attempt.id,
      userId: user.id,
      amountCents: booking.depositAmount,
      serviceName: booking.service.name,
      customerEmail: user.email,
      successUrl,
      cancelUrl,
      idempotencyKey: `deposit-checkout-${attempt.id}`,
    }));
  } catch (error) {
    console.error("[createDepositCheckout] stripe create failed", booking.id, error);
    // Idempotency may return a session that is already paid — recover it.
    const recovered = await recoverPaidSessionForAttempt(booking.id, attempt.id);
    if (recovered) {
      return {
        ok: false,
        alreadyPaid: true,
        error: "Payment already received for this booking. Refresh the page to see confirmation.",
      };
    }
    return { ok: false, error: "Unable to start checkout. Please try again." };
  }

  // If Stripe reused an idempotent session that is already paid, confirm instead of redirecting.
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    if (session.payment_status === "paid") {
      const knownCapture = settledCaptureFromCheckoutSession(session);
      await reconcileBookingPayments(booking.id, {
        knownCaptures: knownCapture ? [knownCapture] : [],
      });
      return {
        ok: false,
        alreadyPaid: true,
        error: "Payment already received for this booking. Refresh the page to see confirmation.",
      };
    }
  } catch (error) {
    console.warn("[createDepositCheckout] post-create session inspect failed", sessionId, error);
  }

  try {
    await prisma.payment.update({
      where: { id: attempt.id },
      data: { providerPaymentId: sessionId },
    });
  } catch (linkError) {
    console.error("[createDepositCheckout] failed to link session", sessionId, linkError);

    // Session may already be linked on another row, or already paid — reconcile before giving up.
    const recovered = await recoverPaidSessionById(booking.id, sessionId);
    if (recovered) {
      return {
        ok: false,
        alreadyPaid: true,
        error: "Payment already received for this booking. Refresh the page to see confirmation.",
      };
    }

    await paymentService.voidCheckoutSession(sessionId).catch((voidError) => {
      console.error("[createDepositCheckout] failed to void orphaned session", sessionId, voidError);
    });
    return { ok: false, error: "Unable to start checkout. Please try again." };
  }

  return { ok: true, url };
}

async function recoverPaidSessionForAttempt(
  bookingId: string,
  paymentId: string,
): Promise<boolean> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (payment?.providerPaymentId?.startsWith("cs_")) {
    return recoverPaidSessionById(bookingId, payment.providerPaymentId);
  }
  const captures = await findPaidCapturesFromLinkedSessions(bookingId);
  if (captures.length === 0) return false;
  const result = await reconcileBookingPayments(bookingId, { knownCaptures: captures });
  return result.depositSatisfied || result.bookingConfirmed;
}

async function recoverPaidSessionById(bookingId: string, sessionId: string): Promise<boolean> {
  if (!sessionId.startsWith("cs_")) return false;
  try {
    return await reconcileBookingFromCheckoutSessionId(bookingId, sessionId);
  } catch (error) {
    console.error("[createDepositCheckout] recover paid session failed", sessionId, error);
    return false;
  }
}
