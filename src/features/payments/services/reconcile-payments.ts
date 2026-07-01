import "server-only";

import type Stripe from "stripe";

import { env } from "@/env";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { Booking, Invoice, Payment, Prisma } from "@prisma/client";

import { generateInvoiceNumber } from "./invoice";

export type PaymentReconcileResult = {
  amountPaid: number;
  amountDue: number;
  depositSatisfied: boolean;
  fullyPaid: boolean;
  bookingConfirmed: boolean;
};

type BookingWithRelations = Booking & {
  payments: Payment[];
  invoice: Invoice | null;
};

function sessionAmountCents(session: Stripe.Checkout.Session): number {
  return session.amount_total ?? 0;
}

/** Loads every Stripe Checkout session ID we have on file for a booking. */
async function findPaidCheckoutSessions(bookingId: string): Promise<Stripe.Checkout.Session[]> {
  const stripe = getStripe();
  const byId = new Map<string, Stripe.Checkout.Session>();

  const payments = await prisma.payment.findMany({
    where: { bookingId, providerPaymentId: { not: null } },
    select: { providerPaymentId: true },
  });

  for (const payment of payments) {
    if (!payment.providerPaymentId?.startsWith("cs_")) continue;

    try {
      const session = await stripe.checkout.sessions.retrieve(payment.providerPaymentId);
      if (session.metadata?.bookingId === bookingId && session.payment_status === "paid") {
        byId.set(session.id, session);
      }
    } catch {
      // Session may have been deleted or is invalid — ignore.
    }
  }

  return [...byId.values()];
}

async function recordPaidSession(
  tx: Prisma.TransactionClient,
  booking: BookingWithRelations,
  session: Stripe.Checkout.Session,
): Promise<number> {
  const amount = sessionAmountCents(session);
  if (amount <= 0) return 0;

  const existing = await tx.payment.findFirst({
    where: { providerPaymentId: session.id },
  });

  if (existing?.status === "SUCCEEDED") {
    return existing.amount;
  }

  const metadataPaymentId = session.metadata?.paymentId;

  if (existing) {
    await tx.payment.update({
      where: { id: existing.id },
      data: { status: "SUCCEEDED", amount },
    });
    return amount;
  }

  if (metadataPaymentId) {
    const linked = await tx.payment.findUnique({ where: { id: metadataPaymentId } });
    if (linked && linked.status !== "SUCCEEDED") {
      await tx.payment.update({
        where: { id: metadataPaymentId },
        data: {
          status: "SUCCEEDED",
          providerPaymentId: session.id,
          amount,
        },
      });
      return amount;
    }
  }

  const duplicateType =
    amount >= booking.balanceAmount && booking.balanceAmount > 0 ? "BALANCE" : "DEPOSIT";

  await tx.payment.create({
    data: {
      bookingId: booking.id,
      type: duplicateType,
      amount,
      status: "SUCCEEDED",
      providerPaymentId: session.id,
    },
  });

  return amount;
}

function sumSucceededPayments(payments: Payment[]): number {
  return payments
    .filter((payment) => payment.status === "SUCCEEDED")
    .reduce((total, payment) => total + payment.amount, 0);
}

/**
 * Reconciles Stripe Checkout sessions with local payment records.
 * Handles missed webhooks, double payments, and duplicate checkout sessions.
 */
export async function reconcileBookingPayments(
  bookingId: string,
): Promise<PaymentReconcileResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, invoice: true },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found.`);
  }

  let paidSessions: Stripe.Checkout.Session[] = [];
  if (env.STRIPE_SECRET_KEY?.trim()) {
    paidSessions = await findPaidCheckoutSessions(bookingId);
  }

  let invoiceNumber: string | null = null;

  await prisma.$transaction(async (tx) => {
    for (const session of paidSessions) {
      await recordPaidSession(tx, booking, session);
    }

    const payments = await tx.payment.findMany({ where: { bookingId } });
    const amountPaid = Math.min(sumSucceededPayments(payments), booking.totalAmount);
    const depositSatisfied = amountPaid >= booking.depositAmount;

    if (depositSatisfied && booking.status === "PENDING_PAYMENT") {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });
    }

    if (depositSatisfied) {
      if (booking.invoice) {
        await tx.invoice.update({
          where: { id: booking.invoice.id },
          data: { amountPaid },
        });
      } else {
        invoiceNumber = await generateInvoiceNumber();
        await tx.invoice.create({
          data: {
            bookingId,
            number: invoiceNumber,
            amountDue: booking.totalAmount,
            amountPaid,
          },
        });
      }
    }
  });

  const refreshed = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, invoice: true },
  });

  if (!refreshed) {
    throw new Error(`Booking ${bookingId} not found after reconcile.`);
  }

  const amountPaid = Math.min(
    sumSucceededPayments(refreshed.payments),
    refreshed.totalAmount,
  );

  return {
    amountPaid,
    amountDue: refreshed.totalAmount,
    depositSatisfied: amountPaid >= refreshed.depositAmount,
    fullyPaid: amountPaid >= refreshed.totalAmount,
    bookingConfirmed: refreshed.status === "CONFIRMED",
  };
}

/** Returns an open Stripe Checkout URL for the deposit if one already exists. */
export async function getOpenDepositCheckoutUrl(paymentId: string): Promise<string | null> {
  if (!env.STRIPE_SECRET_KEY?.trim()) return null;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment?.providerPaymentId?.startsWith("cs_")) return null;

  try {
    const session = await getStripe().checkout.sessions.retrieve(payment.providerPaymentId);

    if (session.status === "open" && session.url) {
      return session.url;
    }

    if (session.status === "expired") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { providerPaymentId: null },
      });
    }
  } catch {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { providerPaymentId: null },
    });
  }

  return null;
}

/** Reuses any in-progress checkout before starting a new one. */
export async function getOpenDepositCheckoutUrlForBooking(
  bookingId: string,
): Promise<string | null> {
  const pending = await prisma.payment.findMany({
    where: {
      bookingId,
      status: "PENDING",
      providerPaymentId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const payment of pending) {
    const url = await getOpenDepositCheckoutUrl(payment.id);
    if (url) return url;
  }

  return null;
}

/** Creates a fresh pending payment row for a new checkout attempt. */
export async function createDepositCheckoutAttempt(bookingId: string, amount: number) {
  return prisma.payment.create({
    data: {
      bookingId,
      type: "DEPOSIT",
      amount,
      status: "PENDING",
    },
  });
}
