import "server-only";

import type Stripe from "stripe";

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
