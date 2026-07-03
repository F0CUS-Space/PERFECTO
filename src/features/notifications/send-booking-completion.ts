import "server-only";

import { env } from "@/env";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

import { bookingCompletionEmail } from "./emails/booking-emails";

export type SendCompletionEmailResult = { sent: true } | { sent: false; reason: string };

function customerDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  phone: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.phone;
}

export async function maybeSendBookingCompletionEmail(
  bookingId: string,
): Promise<SendCompletionEmailResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, service: true },
  });

  if (!booking) return { sent: false, reason: "not_found" };
  if (booking.status !== "COMPLETED") return { sent: false, reason: "not_completed" };
  if (booking.completionEmailSentAt) return { sent: false, reason: "already_sent" };

  const email = booking.user.email?.trim();
  if (!email) return { sent: false, reason: "no_customer_email" };

  const template = bookingCompletionEmail({
    customerName: customerDisplayName(booking.user),
    serviceName: booking.service.name,
    bookingId: booking.id,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });

  try {
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (result.skipped) return { sent: false, reason: "email_not_configured" };

    await prisma.booking.updateMany({
      where: { id: bookingId, completionEmailSentAt: null },
      data: { completionEmailSentAt: new Date() },
    });

    return { sent: true };
  } catch (error) {
    console.error("[maybeSendBookingCompletionEmail]", bookingId, error);
    return { sent: false, reason: "send_failed" };
  }
}
