"use server";

import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { isStripeConfigured } from "@/lib/stripe-ready";
import { requireUser } from "@/server/rbac";

import {
  createDepositCheckoutAttempt,
  getOpenDepositCheckoutUrlForBooking,
  reconcileBookingPayments,
} from "./services/reconcile-payments";
import { getPaymentService } from "./services/stripe-payment-service";

export type CreateDepositCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Creates a Stripe Checkout session for the booking deposit. */
export async function createDepositCheckout(
  bookingId: string,
): Promise<CreateDepositCheckoutResult> {
  try {
    if (!isStripeConfigured()) {
      return { ok: false, error: "Payments are not configured on the server." };
    }

    const user = await requireUser();

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
        error: "Deposit already paid. Any remaining balance is due after your service.",
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
    const successUrl = `${baseUrl}/book/confirmation/${booking.id}?checkout=success`;
    const cancelUrl = `${baseUrl}/book/confirmation/${booking.id}?checkout=cancelled`;

    const { url, sessionId } = await getPaymentService().createDepositCheckoutSession({
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

    await prisma.payment.update({
      where: { id: attempt.id },
      data: { providerPaymentId: sessionId },
    });

    return { ok: true, url };
  } catch (error) {
    console.error("[createDepositCheckout]", error);
    return { ok: false, error: "Unable to start checkout. Please try again." };
  }
}
