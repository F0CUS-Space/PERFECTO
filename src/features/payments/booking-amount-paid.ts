import "server-only";

import { prisma } from "@/lib/prisma";

/** Sum succeeded payments per booking in a single query (avoids N+1). */
export async function amountPaidByBookingIds(
  bookingIds: string[],
): Promise<Map<string, number>> {
  if (bookingIds.length === 0) return new Map();

  const rows = await prisma.payment.groupBy({
    by: ["bookingId"],
    where: {
      bookingId: { in: bookingIds },
      status: "SUCCEEDED",
    },
    _sum: { amount: true },
  });

  return new Map(rows.map((row) => [row.bookingId, row._sum.amount ?? 0]));
}

export function cappedAmountPaid(
  paidMap: Map<string, number>,
  bookingId: string,
  totalAmount: number,
): number {
  return Math.min(paidMap.get(bookingId) ?? 0, totalAmount);
}
