import "server-only";

import type { BookingStatus } from "@prisma/client";

import {
  amountPaidByBookingIds,
  cappedAmountPaid,
} from "@/features/payments/booking-amount-paid";

export type BookingPaymentState = {
  amountPaid: number;
  depositSatisfied: boolean;
  fullyPaid: boolean;
};

/** Payment totals from Postgres only — no Stripe API calls (use on page loads). */
export async function getBookingPaymentStateFromDb(
  bookingId: string,
  amounts: { totalAmount: number; depositAmount: number; status: BookingStatus },
): Promise<BookingPaymentState> {
  const paidMap = await amountPaidByBookingIds([bookingId]);
  const amountPaid = cappedAmountPaid(paidMap, bookingId, amounts.totalAmount);
  const depositSatisfied =
    amounts.status !== "PENDING_PAYMENT" || amountPaid >= amounts.depositAmount;

  return {
    amountPaid,
    depositSatisfied,
    fullyPaid: amountPaid >= amounts.totalAmount,
  };
}
