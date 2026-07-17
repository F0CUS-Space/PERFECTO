"use server";

import { requireUser } from "@/server/rbac";

import { createDepositCheckoutForUser } from "./services/create-deposit-checkout";
import { reconcileBookingFromCheckoutSessionId } from "./services/confirm-deposit";
import { reconcileBookingPayments } from "./services/reconcile-payments";
import { prisma } from "@/lib/prisma";

export type CreateDepositCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string; alreadyPaid?: boolean };

/** Creates a Stripe Checkout session for the booking payment. */
export async function createDepositCheckout(
  bookingId: string,
): Promise<CreateDepositCheckoutResult> {
  try {
    const user = await requireUser();
    return await createDepositCheckoutForUser(bookingId, user);
  } catch (error) {
    console.error("[createDepositCheckout]", error);
    return { ok: false, error: "Unable to start checkout. Please try again." };
  }
}

export type SyncCheckoutResult =
  | { ok: true; depositSatisfied: boolean; bookingConfirmed: boolean }
  | { ok: false; error: string };

/**
 * Client-callable recovery after Stripe redirect. Prefer session_id when present
 * so confirmation works even without a linked Payment row or webhook delivery.
 */
export async function syncCheckoutSession(input: {
  bookingId: string;
  sessionId?: string | null;
}): Promise<SyncCheckoutResult> {
  try {
    const user = await requireUser();
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, userId: user.id },
      select: { id: true, status: true },
    });
    if (!booking) {
      return { ok: false, error: "Booking not found." };
    }

    if (booking.status === "CONFIRMED") {
      return { ok: true, depositSatisfied: true, bookingConfirmed: true };
    }

    const sessionId = input.sessionId?.trim();
    let depositSatisfied = false;
    if (sessionId) {
      depositSatisfied = await reconcileBookingFromCheckoutSessionId(booking.id, sessionId);
    } else {
      const result = await reconcileBookingPayments(booking.id);
      depositSatisfied = result.depositSatisfied;
    }

    const refreshed = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true },
    });

    return {
      ok: true,
      depositSatisfied,
      bookingConfirmed: refreshed?.status === "CONFIRMED",
    };
  } catch (error) {
    console.error("[syncCheckoutSession]", input.bookingId, error);
    return { ok: false, error: "Could not confirm payment yet. Please try again." };
  }
}
