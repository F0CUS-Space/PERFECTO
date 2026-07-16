import "server-only";

import type { User } from "@prisma/client";

import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe-ready";

import {
  createDepositCheckoutAttempt,
  getOpenDepositCheckoutUrlForBooking,
  reconcileBookingPayments,
} from "./reconcile-payments";
import { getPaymentService } from "./stripe-payment-service";

export type CreateDepositCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

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

  const reconcile = await reconcileBookingPayments(booking.id);

  if (reconcile.fullyPaid) {
    return { ok: false, error: "This booking is already paid in full." };
  }

  if (reconcile.depositSatisfied) {
    return {
      ok: false,
      error: "Payment already received for this booking.",
    };
  }

  if (booking.status === "CONFIRMED") {
    return { ok: false, error: "This booking is already confirmed." };
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

  const { url, sessionId } = await paymentService.createDepositCheckoutSession({
    bookingId: booking.id,
    paymentId: attempt.id,
    userId: user.id,
    amountCents: booking.depositAmount,
    serviceName: booking.service.name,
    customerEmail: user.email,
    successUrl,
    cancelUrl,
    idempotencyKey: `deposit-checkout-${attempt.id}`,
  });

  try {
    await prisma.payment.update({
      where: { id: attempt.id },
      data: { providerPaymentId: sessionId },
    });
  } catch (linkError) {
    console.error("[createDepositCheckout] failed to link session; voiding", sessionId, linkError);
    await paymentService.voidCheckoutSession(sessionId).catch((voidError) => {
      console.error("[createDepositCheckout] failed to void orphaned session", sessionId, voidError);
    });
    return { ok: false, error: "Unable to start checkout. Please try again." };
  }

  return { ok: true, url };
}
