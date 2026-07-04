"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { minScheduleDateString, parseScheduleDate } from "@/config/booking";
import {
  canCustomerCancelBooking,
  canCustomerRescheduleBooking,
} from "@/features/dashboard/booking-rules";
import { getScheduleAvailabilityError } from "@/features/booking/services/schedule-availability";
import {
  notifyAdminsBookingCancelled,
  notifyAdminsBookingRescheduled,
} from "@/features/notifications/create-notifications";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/rbac";

export type DashboardBookingActionResult = { ok: true } | { ok: false; error: string };

const acknowledgeSchema = z.literal(true, {
  errorMap: () => ({ message: "Please confirm you understand the policy." }),
});

const cancelBookingSchema = z.object({
  bookingId: z.string().min(1),
  acknowledged: acknowledgeSchema,
});

const rescheduleBookingSchema = z.object({
  bookingId: z.string().min(1),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
    .refine((val) => val >= minScheduleDateString(), "Date must be at least tomorrow"),
  arrivalWindow: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a valid arrival time"),
  acknowledged: acknowledgeSchema,
});

export async function cancelCustomerBooking(
  input: z.infer<typeof cancelBookingSchema>,
): Promise<DashboardBookingActionResult> {
  const user = await requireUser();
  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid request." };
  }

  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, userId: user.id },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  if (!canCustomerCancelBooking(booking)) {
    return { ok: false, error: "This booking can no longer be cancelled." };
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
  });

  await notifyAdminsBookingCancelled(booking.id);

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.id}`);
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${booking.id}`);

  return { ok: true };
}

export async function rescheduleCustomerBooking(
  input: z.infer<typeof rescheduleBookingSchema>,
): Promise<DashboardBookingActionResult> {
  const user = await requireUser();
  const parsed = rescheduleBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid request." };
  }

  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, userId: user.id },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  if (!canCustomerRescheduleBooking(booking)) {
    return { ok: false, error: "This booking can no longer be rescheduled." };
  }

  const availabilityError = await getScheduleAvailabilityError(
    parsed.data.scheduledDate,
    parsed.data.arrivalWindow,
  );
  if (availabilityError) {
    return { ok: false, error: availabilityError };
  }

  const newDate = parseScheduleDate(parsed.data.scheduledDate);
  if (newDate.getTime() === booking.scheduledDate.getTime() && parsed.data.arrivalWindow === booking.arrivalWindow) {
    return { ok: false, error: "Choose a different date or arrival time." };
  }

  const previousDate = booking.scheduledDate;
  const previousArrivalWindow = booking.arrivalWindow;

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      scheduledDate: newDate,
      arrivalWindow: parsed.data.arrivalWindow,
      rescheduledAt: new Date(),
      rescheduleCount: { increment: 1 },
    },
  });

  await notifyAdminsBookingRescheduled(booking.id, previousDate, previousArrivalWindow);

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.id}`);
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${booking.id}`);

  return { ok: true };
}
