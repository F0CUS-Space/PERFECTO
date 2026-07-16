import "server-only";

import { prisma } from "@/lib/prisma";

import { reconcileBookingPayments } from "./reconcile-payments";
import { drainOutbox } from "./outbox";

export type SweepResult = {
  scanned: number;
  confirmed: number;
  overpaid: number;
  errors: number;
};

export type MaintenanceResult = {
  sweep: SweepResult;
  outbox: { processed: number; failed: number };
};

type SweepOptions = {
  /** Skip bookings touched more recently than this — gives the normal webhook/redirect flow time to land. */
  olderThanMinutes?: number;
  /** Ignore very old bookings so an abandoned backlog never grows the scan unbounded. */
  lookbackDays?: number;
  /** Max bookings reconciled per run. */
  limit?: number;
};

/**
 * Re-reconciles bookings that are still PENDING_PAYMENT despite having a linked
 * Stripe session — i.e. the confirming webhook was missed or dropped. This is the
 * durability backstop for {@link reconcileBookingPayments}; safe to run repeatedly.
 */
export async function sweepStuckPendingBookings(options: SweepOptions = {}): Promise<SweepResult> {
  const olderThanMinutes = options.olderThanMinutes ?? 10;
  const lookbackDays = options.lookbackDays ?? 14;
  const limit = options.limit ?? 100;

  const now = Date.now();
  const createdAfter = new Date(now - lookbackDays * 24 * 60 * 60 * 1000);
  const updatedBefore = new Date(now - olderThanMinutes * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "PENDING_PAYMENT",
      createdAt: { gte: createdAfter },
      updatedAt: { lte: updatedBefore },
      payments: { some: { providerPaymentId: { not: null } } },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const result: SweepResult = { scanned: bookings.length, confirmed: 0, overpaid: 0, errors: 0 };

  for (const { id } of bookings) {
    try {
      const reconciled = await reconcileBookingPayments(id);
      if (reconciled.newlyConfirmed) result.confirmed += 1;
      if (reconciled.overpaid) result.overpaid += 1;
    } catch (error) {
      result.errors += 1;
      console.error("[sweep] reconcile failed", id, error);
    }
  }

  return result;
}

/**
 * One scheduled maintenance pass: reconcile stuck bookings, then drain any
 * pending outbox side effects (confirmation emails/notifications). Invoked by the
 * cron route/script.
 */
export async function runPaymentsMaintenance(options: SweepOptions = {}): Promise<MaintenanceResult> {
  const sweep = await sweepStuckPendingBookings(options);
  const outbox = await drainOutbox(100);
  return { sweep, outbox };
}
