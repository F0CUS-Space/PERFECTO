import "server-only";

import type { BookingStatus } from "@prisma/client";

import { reconcileBookingPayments } from "@/features/payments/services/reconcile-payments";
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

const TERMINAL_STATUSES: BookingStatus[] = ["COMPLETED", "CANCELLED"];

function isUpcoming(scheduledDate: Date, status: BookingStatus): boolean {
  if (TERMINAL_STATUSES.includes(status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(scheduledDate);
  scheduled.setHours(0, 0, 0, 0);
  return scheduled >= today;
}

async function amountPaidFromDb(bookingId: string, totalAmount: number): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: { bookingId, status: "SUCCEEDED" },
    select: { amount: true },
  });
  return Math.min(
    payments.reduce((sum, payment) => sum + payment.amount, 0),
    totalAmount,
  );
}

export async function getCustomerBookings(userId: string): Promise<CustomerBookingSummary[]> {
  if (!isDatabaseConfigured()) return [];

  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: {
      service: { select: { name: true } },
      invoice: { select: { number: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  const summaries = await Promise.all(
    bookings.map(async (booking) => {
      const amountPaid = await amountPaidFromDb(booking.id, booking.totalAmount);

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
    }),
  );

  return summaries.sort((a, b) => {
    if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
    return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
  });
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

  let amountPaid = 0;
  let depositSatisfied = false;
  let fullyPaid = false;

  try {
    const reconcile = await reconcileBookingPayments(booking.id);
    amountPaid = reconcile.amountPaid;
    depositSatisfied = reconcile.depositSatisfied;
    fullyPaid = reconcile.fullyPaid;
  } catch {
    amountPaid = await amountPaidFromDb(booking.id, booking.totalAmount);
    depositSatisfied = amountPaid >= booking.depositAmount;
    fullyPaid = amountPaid >= booking.totalAmount;
  }

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
    bedrooms: booking.bedrooms,
    bathrooms: booking.bathrooms,
    hasPets: booking.hasPets,
    accessInfo: booking.accessInfo,
    specialInstructions: booking.specialInstructions,
    signatureName: booking.agreement?.signatureName ?? null,
    signedAt: booking.agreement?.signedAt?.toISOString() ?? null,
    fullyPaid,
    depositSatisfied,
    hasReview: Boolean(booking.review),
    canCancel: canCustomerCancelBooking(booking),
    canReschedule: canCustomerRescheduleBooking(booking),
    canReview: canCustomerReviewBooking({
      status: booking.status,
      scheduledDate: booking.scheduledDate,
      depositSatisfied,
      hasReview: Boolean(booking.review),
    }),
    rescheduleCount: booking.rescheduleCount,
    promotionTitle: booking.promotionTitle,
    promotionDiscountCents: booking.promotionDiscountCents,
  };
}

export async function getCustomerPayments(userId: string): Promise<CustomerPaymentRow[]> {
  if (!isDatabaseConfigured()) return [];

  const payments = await prisma.payment.findMany({
    where: { booking: { userId } },
    include: {
      booking: {
        select: {
          service: { select: { name: true } },
          invoice: { select: { number: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return payments.map((payment) => ({
    id: payment.id,
    bookingId: payment.bookingId,
    serviceName: payment.booking.service.name,
    type: payment.type,
    status: payment.status,
    amount: payment.amount,
    createdAt: payment.createdAt.toISOString(),
    invoiceNumber: payment.booking.invoice?.number ?? null,
  }));
}

export async function getCustomerDashboardStats(userId: string) {
  const bookings = await getCustomerBookings(userId);
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
