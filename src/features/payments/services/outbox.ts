import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { handleBookingNewlyConfirmed } from "@/features/notifications/handle-booking-confirmed";

/** Known outbox event types. Keep in sync with the handlers in {@link processOutboxEvent}. */
export const OUTBOX_EVENT = {
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
} as const;

const MAX_ATTEMPTS = 8;

/**
 * Enqueues a durable side-effect intent. MUST be called with a transaction client
 * so the event is persisted atomically with the state change that produced it.
 */
export async function enqueueOutboxEvent(
  tx: Prisma.TransactionClient,
  type: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  await tx.outboxEvent.create({ data: { type, payload } });
}

async function runHandler(type: string, payload: unknown): Promise<void> {
  switch (type) {
    case OUTBOX_EVENT.BOOKING_CONFIRMED: {
      const bookingId = (payload as { bookingId?: string })?.bookingId;
      if (!bookingId) throw new Error("BOOKING_CONFIRMED payload missing bookingId");
      await handleBookingNewlyConfirmed(bookingId);
      return;
    }
    default:
      throw new Error(`Unknown outbox event type: ${type}`);
  }
}

/**
 * Drains pending outbox events. Safe to call concurrently: each event is claimed
 * via a conditional update before its handler runs, and every handler is idempotent.
 */
export async function drainOutbox(limit = 25): Promise<{ processed: number; failed: number }> {
  const pending = await prisma.outboxEvent.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let failed = 0;

  for (const event of pending) {
    // Claim: only one worker wins this row.
    const claimed = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: event.status },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    try {
      await runHandler(event.type, event.payload);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date(), lastError: null },
      });
      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[outbox] handler failed", event.type, event.id, message);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "FAILED", lastError: message },
      });
      failed += 1;
    }
  }

  return { processed, failed };
}
