import "server-only";

import { maybeSendBookingConfirmationEmail } from "@/features/notifications/send-booking-confirmation";

import { notifyAdminsNewBooking } from "./create-notifications";

/** Runs once when a booking moves from pending payment to confirmed. */
export async function handleBookingNewlyConfirmed(bookingId: string): Promise<void> {
  await maybeSendBookingConfirmationEmail(bookingId);
  await notifyAdminsNewBooking(bookingId);
}
