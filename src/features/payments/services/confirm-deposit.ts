import "server-only";

import type Stripe from "stripe";

import { env } from "@/env";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

import { generateInvoiceNumber } from "./invoice";

/**
 * Confirms a deposit after Stripe Checkout completes.
 * Idempotent — safe if the webhook fires more than once.
 */
export async function confirmDepositFromCheckoutSession(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  const paymentId = session.metadata?.paymentId;

  if (!bookingId || !paymentId) {
    throw new Error("Checkout session missing booking metadata.");
  }

  if (session.payment_status !== "paid") {
    return { skipped: true as const, reason: "payment_not_paid" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: { where: { id: paymentId } }, invoice: true },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  if (booking.status === "CONFIRMED") {
    return { skipped: true as const, reason: "already_confirmed" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "SUCCEEDED",
        providerPaymentId: session.id,
      },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });

    if (!booking.invoice) {
      const number = await generateInvoiceNumber();
      await tx.invoice.create({
        data: {
          bookingId,
          number,
          amountDue: booking.totalAmount,
          amountPaid: booking.depositAmount,
        },
      });
    }
  });

  return { skipped: false as const, bookingId };
}

/**
 * Verifies a pending deposit against Stripe Checkout when the user returns from
 * payment. Webhooks are the primary source of truth, but on HTTP dev/staging
 * hosts they often never arrive — this keeps confirmation in sync.
 */
export async function syncBookingDepositIfPaid(bookingId: string): Promise<boolean> {
  if (!env.STRIPE_SECRET_KEY?.trim()) {
    return false;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: { where: { type: "DEPOSIT" }, take: 1 } },
  });

  if (!booking || booking.status === "CONFIRMED") {
    return booking?.status === "CONFIRMED";
  }

  const payment = booking.payments[0];
  if (!payment || payment.status === "SUCCEEDED" || !payment.providerPaymentId) {
    return false;
  }

  const session = await getStripe().checkout.sessions.retrieve(payment.providerPaymentId);
  const result = await confirmDepositFromCheckoutSession(session);

  if (result.skipped) {
    return result.reason === "already_confirmed";
  }

  return true;
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
