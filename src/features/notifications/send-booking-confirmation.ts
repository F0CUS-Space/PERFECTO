import "server-only";

import { env } from "@/env";
import {
  buildInvoiceData,
  renderInvoicePdf,
} from "@/features/dashboard/services/invoice-download";
import { sendEmail } from "@/lib/email";
import { buildBookingIcs } from "@/lib/calendar-event";
import { prisma } from "@/lib/prisma";

import { bookingConfirmationEmail } from "./emails/booking-emails";

export type SendBookingConfirmationResult =
  | { sent: true }
  | { sent: false; reason: string };

function customerDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  phone: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.phone;
}

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

  if (!booking) return { sent: false, reason: "not_found" };
  if (booking.status !== "CONFIRMED") return { sent: false, reason: "not_confirmed" };
  if (booking.confirmationEmailSentAt) return { sent: false, reason: "already_sent" };

  const email = booking.user.email?.trim();
  if (!email) return { sent: false, reason: "no_customer_email" };

  const amountPaid = Math.min(
    booking.payments.reduce((sum, payment) => sum + payment.amount, 0),
    booking.totalAmount,
  );
  if (amountPaid < booking.depositAmount) return { sent: false, reason: "payment_incomplete" };

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const location = `${booking.addressLine}, ${booking.city} ${booking.postalCode}`;

  const template = bookingConfirmationEmail({
    customerName: customerDisplayName(booking.user),
    serviceName: booking.service.name,
    scheduledDate: booking.scheduledDate,
    arrivalWindow: booking.arrivalWindow,
    addressLine: booking.addressLine,
    city: booking.city,
    postalCode: booking.postalCode,
    amountPaid,
    totalAmount: booking.totalAmount,
    invoiceNumber: booking.invoice?.number ?? null,
    bookingId: booking.id,
    appUrl,
  });

  const ics = buildBookingIcs({
    uid: `perfecto-booking-${booking.id}@perfecto`,
    title: `${booking.service.name} — Perfecto`,
    scheduledDate: booking.scheduledDate,
    arrivalWindow: booking.arrivalWindow,
    location,
    description: `Perfecto cleaning appointment at ${location}`,
  });

  const attachments: { filename: string; content: Buffer }[] = [
    {
      filename: "perfecto-booking.ics",
      content: Buffer.from(ics, "utf-8"),
    },
  ];

  const invoiceData = buildInvoiceData(booking);
  if (invoiceData) {
    try {
      attachments.push({
        filename: `${invoiceData.number}.pdf`,
        content: await renderInvoicePdf(invoiceData),
      });
    } catch (error) {
      console.error("[maybeSendBookingConfirmationEmail] invoice PDF failed", bookingId, error);
    }
  }

  try {
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      attachments,
    });

    if (result.skipped) return { sent: false, reason: "email_not_configured" };

    const updated = await prisma.booking.updateMany({
      where: { id: bookingId, confirmationEmailSentAt: null },
      data: { confirmationEmailSentAt: new Date() },
    });

    if (updated.count === 0) return { sent: false, reason: "already_sent" };
    return { sent: true };
  } catch (error) {
    console.error("[maybeSendBookingConfirmationEmail]", bookingId, error);
    return { sent: false, reason: "send_failed" };
  }
}
