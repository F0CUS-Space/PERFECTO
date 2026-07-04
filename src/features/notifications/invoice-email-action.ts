"use server";

import { sendBookingInvoiceEmail } from "@/features/notifications/send-booking-invoice";

export async function sendBookingInvoiceEmailAction(bookingId: string) {
  return sendBookingInvoiceEmail(bookingId);
}
