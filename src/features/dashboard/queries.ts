import "server-only";

import type { BookingStatus } from "@prisma/client";

import {
  amountPaidByBookingIds,
  cappedAmountPaid,
} from "@/features/payments/booking-amount-paid";
import { getBookingPaymentStateFromDb } from "@/features/payments/booking-payment-state";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";

import {
  canCustomerCancelBooking,
  canCustomerRescheduleBooking,
  canCustomerReviewBooking,
} from "@/features/dashboard/booking-rules";
import type {
  CustomerBookingDetail,
  CustomerBookingSummary,
  CustomerPaymentRow,
} from "./types";

const TERMINAL_STATUSES: BookingStatus[] = ["COMPLETED", "CANCELLED", "REFUNDED"];

function isUpcoming(scheduledDate: Date, status: BookingStatus): boolean {
  if (TERMINAL_STATUSES.includes(status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(scheduledDate);
  scheduled.setHours(0, 0, 0, 0);
  return scheduled >= today;
}

export async function getCustomerBookings(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<{ bookings: CustomerBookingSummary[]; total: number }> {
  if (!isDatabaseConfigured()) return { bookings: [], total: 0 };

  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where: { userId } }),
    prisma.booking.findMany({
      where: { userId },
      include: {
        service: { select: { name: true } },
        invoice: { select: { number: true } },
      },
      orderBy: { scheduledDate: "desc" },
      take: limit,
      skip: offset,
    }),
  ]);

  const paidMap = await amountPaidByBookingIds(bookings.map((booking) => booking.id));

  const summaries = bookings.map((booking) => {
    const amountPaid = cappedAmountPaid(paidMap, booking.id, booking.totalAmount);

    return {
        id: booking.id,
        serviceName: booking.service.name,
        scheduledDate: booking.scheduledDate.toISOString(),
        arrivalWindow: booking.arrivalWindow,
        status: booking.status,
        totalAmount: booking.totalAmount,
        depositAmount: booking.depositAmount,
        balanceAmount: booking.balanceAmount,
        amountPaid,
        addressLine: booking.addressLine,
        city: booking.city,
        postalCode: booking.postalCode,
        invoiceNumber: booking.invoice?.number ?? null,
        isUpcoming: isUpcoming(booking.scheduledDate, booking.status),
      } satisfies CustomerBookingSummary;
    });

  return {
    bookings: summaries.sort((a, b) => {
      if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
      return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
    }),
    total,
  };
}

export async function getCustomerBookingById(
  userId: string,
  bookingId: string,
): Promise<CustomerBookingDetail | null> {
  if (!isDatabaseConfigured()) return null;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: {
      service: { select: { name: true } },
      invoice: { select: { number: true } },
      agreement: { select: { signatureName: true, signedAt: true } },
      review: { select: { id: true } },
    },
  });

  if (!booking) return null;

  const paymentState = await getBookingPaymentStateFromDb(booking.id, {
    totalAmount: booking.totalAmount,
    depositAmount: booking.depositAmount,
    status: booking.status,
  });

  return {
    id: booking.id,
    serviceName: booking.service.name,
    scheduledDate: booking.scheduledDate.toISOString(),
    arrivalWindow: booking.arrivalWindow,
    status: booking.status,
    totalAmount: booking.totalAmount,
    depositAmount: booking.depositAmount,
    balanceAmount: booking.balanceAmount,
    amountPaid: paymentState.amountPaid,
    addressLine: booking.addressLine,
    city: booking.city,
    postalCode: booking.postalCode,
    invoiceNumber: booking.invoice?.number ?? null,
    isUpcoming: isUpcoming(booking.scheduledDate, booking.status),
    bedrooms: booking.bedrooms,
    bathrooms: booking.bathrooms,
    hasPets: booking.hasPets,
    accessInfo: booking.accessInfo,
    specialInstructions: booking.specialInstructions,
    signatureName: booking.agreement?.signatureName ?? null,
    signedAt: booking.agreement?.signedAt?.toISOString() ?? null,
    fullyPaid: paymentState.fullyPaid,
    depositSatisfied: paymentState.depositSatisfied,
    hasReview: Boolean(booking.review),
    canCancel: canCustomerCancelBooking(booking),
    canReschedule: canCustomerRescheduleBooking(booking),
    canReview: canCustomerReviewBooking({
      status: booking.status,
      scheduledDate: booking.scheduledDate,
      depositSatisfied: paymentState.depositSatisfied,
      hasReview: Boolean(booking.review),
    }),
    rescheduleCount: booking.rescheduleCount,
    promotionTitle: booking.promotionTitle,
    promotionDiscountCents: booking.promotionDiscountCents,
  };
}

export async function getCustomerPayments(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<{ payments: CustomerPaymentRow[]; total: number }> {
  if (!isDatabaseConfigured()) return { payments: [], total: 0 };

  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);

  const where = { booking: { userId } };

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: {
        booking: {
          select: {
            service: { select: { name: true } },
            invoice: { select: { number: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
  ]);

  return {
    payments: payments.map((payment) => ({
    id: payment.id,
    bookingId: payment.bookingId,
    serviceName: payment.booking.service.name,
    type: payment.type,
    status: payment.status,
    amount: payment.amount,
    createdAt: payment.createdAt.toISOString(),
    invoiceNumber: payment.booking.invoice?.number ?? null,
  })),
    total,
  };
}

export async function getCustomerDashboardStats(userId: string) {
  const { bookings } = await getCustomerBookings(userId, { limit: 100, offset: 0 });
  const upcoming = bookings.filter((b) => b.isUpcoming);
  const pendingDeposit = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT" && b.amountPaid < b.depositAmount,
  );

  return {
    upcomingCount: upcoming.length,
    totalBookings: bookings.length,
    pendingDepositCount: pendingDeposit.length,
    recentBookings: bookings.slice(0, 20),
  };
}
