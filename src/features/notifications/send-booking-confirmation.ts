import "server-only";

import { env } from "@/env";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

import { bookingConfirmationEmail } from "./emails/booking-emails";

export type SendBookingConfirmationResult =
  | { sent: true }
  | { sent: false; reason: string };

function formatBookingDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function customerDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  phone: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.phone;
}

/**
 * Sends booking + payment confirmation once per booking (idempotent via confirmationEmailSentAt).
 */
export async function maybeSendBookingConfirmationEmail(
  bookingId: string,
): Promise<SendBookingConfirmationResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      service: true,
      invoice: true,
      payments: { where: { status: "SUCCEEDED" } },
    },
  });

  if (!booking) {
    return { sent: false, reason: "not_found" };
  }

  if (booking.status !== "CONFIRMED") {
    return { sent: false, reason: "not_confirmed" };
  }

  if (booking.confirmationEmailSentAt) {
    return { sent: false, reason: "already_sent" };
  }

  const email = booking.user.email?.trim();
  if (!email) {
    return { sent: false, reason: "no_customer_email" };
  }

  const amountPaid = Math.min(
    booking.payments.reduce((sum, payment) => sum + payment.amount, 0),
    booking.totalAmount,
  );

  if (amountPaid < booking.depositAmount) {
    return { sent: false, reason: "payment_incomplete" };
  }

  const template = bookingConfirmationEmail({
    customerName: customerDisplayName(booking.user),
    serviceName: booking.service.name,
    scheduledDate: formatBookingDate(booking.scheduledDate),
    arrivalWindow: booking.arrivalWindow,
    addressLine: booking.addressLine,
    city: booking.city,
    postalCode: booking.postalCode,
    amountPaid,
    totalAmount: booking.totalAmount,
    invoiceNumber: booking.invoice?.number ?? null,
    bookingId: booking.id,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });

  try {
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (result.skipped) {
      return { sent: false, reason: "email_not_configured" };
    }

    const updated = await prisma.booking.updateMany({
      where: { id: bookingId, confirmationEmailSentAt: null },
      data: { confirmationEmailSentAt: new Date() },
    });

    if (updated.count === 0) {
      return { sent: false, reason: "already_sent" };
    }

    return { sent: true };
  } catch (error) {
    console.error("[maybeSendBookingConfirmationEmail]", bookingId, error);
    return { sent: false, reason: "send_failed" };
  }
}
