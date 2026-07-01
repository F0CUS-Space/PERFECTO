"use server";

import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { isStripeConfigured } from "@/lib/stripe-ready";
import { requireUser } from "@/server/rbac";

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
      include: {
        service: true,
        payments: { where: { type: "DEPOSIT" }, take: 1 },
      },
    });

    if (!booking) {
      return { ok: false, error: "Booking not found." };
    }

    if (booking.status === "CONFIRMED") {
      return { ok: false, error: "This booking is already confirmed." };
    }

    if (booking.status !== "PENDING_PAYMENT") {
      return { ok: false, error: "This booking cannot accept payment in its current state." };
    }

    const depositPayment = booking.payments[0];
    if (!depositPayment) {
      return { ok: false, error: "Deposit payment record not found." };
    }

    if (depositPayment.status === "SUCCEEDED") {
      return { ok: false, error: "Deposit has already been paid." };
    }

    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const successUrl = `${baseUrl}/book/confirmation/${booking.id}?checkout=success`;
    const cancelUrl = `${baseUrl}/book/confirmation/${booking.id}?checkout=cancelled`;

    const { url, sessionId } = await getPaymentService().createDepositCheckoutSession({
      bookingId: booking.id,
      paymentId: depositPayment.id,
      userId: user.id,
      amountCents: booking.depositAmount,
      serviceName: booking.service.name,
      customerEmail: user.email,
      successUrl,
      cancelUrl,
    });

    await prisma.payment.update({
      where: { id: depositPayment.id },
      data: { providerPaymentId: sessionId },
    });

    return { ok: true, url };
  } catch (error) {
    console.error("[createDepositCheckout]", error);
    return { ok: false, error: "Unable to start checkout. Please try again." };
  }
}
