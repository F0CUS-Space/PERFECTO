import "server-only";

import { env } from "@/env";
import {
  buildInvoiceData,
  renderInvoicePdf,
} from "@/features/dashboard/services/invoice-download";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";

export type SendBookingInvoiceResult =
  | { sent: true }
  | { sent: false; reason: string };

/** Emails the PDF invoice to the customer (e.g. if the confirmation email had no attachment). */
export async function sendBookingInvoiceEmail(
  bookingId: string,
): Promise<SendBookingInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) return { sent: false, reason: "unauthorized" };

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
    include: {
      user: true,
      service: true,
      invoice: true,
    },
  });

  if (!booking?.invoice) return { sent: false, reason: "no_invoice" };

  const email = booking.user.email?.trim();
  if (!email) return { sent: false, reason: "no_customer_email" };

  const invoiceData = buildInvoiceData(booking);
  if (!invoiceData) return { sent: false, reason: "no_invoice" };

  let pdf: Buffer;
  try {
    pdf = await renderInvoicePdf(invoiceData);
  } catch (error) {
    console.error("[sendBookingInvoiceEmail] PDF generation failed", bookingId, error);
    return { sent: false, reason: "pdf_failed" };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const customerName =
    [booking.user.firstName, booking.user.lastName].filter(Boolean).join(" ").trim() ||
    booking.user.phone;

  try {
    const result = await sendEmail({
      to: email,
      subject: `Your invoice ${invoiceData.number} — Perfecto`,
      html: `
        <p>Hi ${customerName},</p>
        <p>Please find your invoice <strong>${invoiceData.number}</strong> for ${booking.service.name} attached as a PDF.</p>
        <p><a href="${appUrl}/dashboard/bookings/${booking.id}">View booking details</a></p>
        <p>— The Perfecto Team</p>
      `,
      attachments: [
        {
          filename: `${invoiceData.number}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });

    if (result.skipped) return { sent: false, reason: "email_not_configured" };
    return { sent: true };
  } catch (error) {
    console.error("[sendBookingInvoiceEmail]", bookingId, error);
    return { sent: false, reason: "send_failed" };
  }
}
