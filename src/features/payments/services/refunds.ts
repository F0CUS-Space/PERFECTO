import "server-only";

import type Stripe from "stripe";

import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { isStripeConfigured } from "@/lib/stripe-ready";
import { netCapturedFromPayments } from "@/features/payments/booking-amount-paid";
import { refundIssuedEmail } from "@/features/notifications/emails/refund-emails";

import type { RefundResult } from "./payment-service";
import { getPaymentService } from "./stripe-payment-service";

export type RefundBookingResult =
  | { ok: true; refundedCents: number }
  | { ok: false; error: string };

function customerName(user: {
  firstName: string | null;
  lastName: string | null;
  phone: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.phone;
}

/**
 * Refunds a booking payment via Stripe and records a REFUND payment row.
 * Business logic only — auth, audit logging, and revalidation live in the admin action.
 */
export async function refundBookingPayment(params: {
  bookingId: string;
  amountCents?: number;
  reason?: string;
}): Promise<RefundBookingResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Payments are not configured on the server." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { payments: true, user: true, service: true },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  const netPaid = netCapturedFromPayments(booking.payments);
  if (netPaid <= 0) {
    return { ok: false, error: "There is no captured payment to refund." };
  }

  const amount = params.amountCents ?? netPaid;
  if (amount <= 0) {
    return { ok: false, error: "Refund amount must be greater than zero." };
  }
  if (amount > netPaid) {
    return { ok: false, error: "Refund exceeds the amount captured for this booking." };
  }

  // Most recent successful inflow that has a Stripe PaymentIntent to refund against.
  const source = booking.payments
    .filter(
      (payment) =>
        payment.type !== "REFUND" &&
        payment.status === "SUCCEEDED" &&
        payment.providerPaymentIntentId,
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  if (!source?.providerPaymentIntentId) {
    return { ok: false, error: "No refundable Stripe payment was found for this booking." };
  }

  let refund: RefundResult;
  try {
    refund = await getPaymentService().refundPayment({
      paymentIntentId: source.providerPaymentIntentId,
      amountCents: amount,
      reason: params.reason,
      idempotencyKey: `refund-${booking.id}-${source.providerPaymentIntentId}-${amount}`,
    });
  } catch (error) {
    console.error("[refundBookingPayment] Stripe refund failed", booking.id, error);
    return { ok: false, error: "The refund could not be processed by Stripe. Please try again." };
  }

  const status = refund.status === "succeeded" ? "REFUNDED" : "PENDING";

  // Idempotent on the refund id via @@unique([provider, providerPaymentId]).
  await prisma.payment.upsert({
    where: {
      provider_providerPaymentId: { provider: "stripe", providerPaymentId: refund.refundId },
    },
    create: {
      bookingId: booking.id,
      provider: "stripe",
      type: "REFUND",
      amount: refund.amountCents,
      status,
      providerPaymentId: refund.refundId,
      providerPaymentIntentId: source.providerPaymentIntentId,
    },
    update: { status },
  });

  await syncInvoiceAmountPaid(booking.id);
  await maybeSendRefundEmail(booking.id);

  return { ok: true, refundedCents: refund.amountCents };
}

/** Recomputes and stores the net paid amount on the invoice, if one exists. */
async function syncInvoiceAmountPaid(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, invoice: true },
  });
  if (!booking?.invoice) return;

  const amountPaid = Math.max(netCapturedFromPayments(booking.payments), 0);
  await prisma.invoice.update({
    where: { id: booking.invoice.id },
    data: { amountPaid },
  });
}

async function maybeSendRefundEmail(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, service: true, payments: true },
  });
  if (!booking) return;

  const email = booking.user.email?.trim();
  if (!email) return;

  const refundedCents = booking.payments
    .filter((payment) => payment.type === "REFUND" && payment.status !== "PENDING")
    .reduce((total, payment) => total + payment.amount, 0);
  if (refundedCents <= 0) return;

  const template = refundIssuedEmail({
    customerName: customerName(booking.user),
    serviceName: booking.service.name,
    refundedCents,
    bookingId: booking.id,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });

  try {
    await sendEmail({ to: email, subject: template.subject, html: template.html });
  } catch (error) {
    console.error("[maybeSendRefundEmail]", bookingId, error);
  }
}

function paymentIntentId(charge: Stripe.Charge): string | null {
  const intent = charge.payment_intent;
  if (!intent) return null;
  return typeof intent === "string" ? intent : intent.id;
}

/**
 * Reconciles refunds reported by Stripe (charge.refunded) — including refunds
 * issued directly from the Stripe dashboard — into local REFUND payment rows.
 */
export async function finalizeRefundFromCharge(charge: Stripe.Charge): Promise<void> {
  const intentId = paymentIntentId(charge);
  if (!intentId) return;

  // Find the booking via any payment row already linked to this PaymentIntent.
  const linked = await prisma.payment.findFirst({
    where: { provider: "stripe", providerPaymentIntentId: intentId },
    select: { bookingId: true },
  });
  if (!linked) return;

  const refunds = charge.refunds?.data ?? [];

  if (refunds.length === 0) {
    // No expanded refund list — mark any pending refunds for this intent as done.
    await prisma.payment.updateMany({
      where: { type: "REFUND", providerPaymentIntentId: intentId, status: "PENDING" },
      data: { status: "REFUNDED" },
    });
    return;
  }

  for (const refund of refunds) {
    await prisma.payment.upsert({
      where: {
        provider_providerPaymentId: { provider: "stripe", providerPaymentId: refund.id },
      },
      create: {
        bookingId: linked.bookingId,
        provider: "stripe",
        type: "REFUND",
        amount: refund.amount,
        status: refund.status === "succeeded" ? "REFUNDED" : "PENDING",
        providerPaymentId: refund.id,
        providerPaymentIntentId: intentId,
      },
      update: {
        status: refund.status === "succeeded" ? "REFUNDED" : "PENDING",
      },
    });
  }

  await syncInvoiceAmountPaid(linked.bookingId);
  await maybeSendRefundEmail(linked.bookingId);
}
