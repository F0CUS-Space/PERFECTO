import "server-only";

import type { Payment } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Net captured amount = successful inflows minus refunds. A REFUND row stores a
 * positive amount and reduces the net; inflows (DEPOSIT/BALANCE) add to it.
 */
export function netCapturedFromPayments(
  payments: Pick<Payment, "type" | "status" | "amount">[],
): number {
  return payments.reduce((total, payment) => {
    if (payment.type === "REFUND") {
      return payment.status === "REFUNDED" || payment.status === "SUCCEEDED"
        ? total - payment.amount
        : total;
    }
    return payment.status === "SUCCEEDED" ? total + payment.amount : total;
  }, 0);
}

/** Net captured amount per booking in a single query (avoids N+1), refund-aware. */
export async function amountPaidByBookingIds(
  bookingIds: string[],
): Promise<Map<string, number>> {
  if (bookingIds.length === 0) return new Map();

  const rows = await prisma.payment.groupBy({
    by: ["bookingId", "type"],
    where: {
      bookingId: { in: bookingIds },
      status: { in: ["SUCCEEDED", "REFUNDED"] },
    },
    _sum: { amount: true },
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    const current = map.get(row.bookingId) ?? 0;
    const amount = row._sum.amount ?? 0;
    map.set(row.bookingId, row.type === "REFUND" ? current - amount : current + amount);
  }
  return map;
}

export function cappedAmountPaid(
  paidMap: Map<string, number>,
  bookingId: string,
  totalAmount: number,
): number {
  return Math.min(paidMap.get(bookingId) ?? 0, totalAmount);
}

/** True when captured (succeeded) payments exceed the booking total — needs admin review/refund. */
export function isOverpaid(
  paidMap: Map<string, number>,
  bookingId: string,
  totalAmount: number,
): boolean {
  return (paidMap.get(bookingId) ?? 0) > totalAmount;
}
