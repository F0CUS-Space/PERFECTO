"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canCustomerReviewBooking } from "@/features/dashboard/booking-rules";
import { getBookingPaymentStateFromDb } from "@/features/payments/booking-payment-state";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/rbac";

const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, "Write at least a few words").max(2000),
});

export type SubmitReviewResult = { ok: true } | { ok: false; error: string };

export async function submitBookingReview(input: z.infer<typeof reviewSchema>): Promise<SubmitReviewResult> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid review." };
  }

  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, userId: user.id },
    include: { review: true },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  let depositSatisfied = booking.status !== "PENDING_PAYMENT";
  if (!depositSatisfied) {
    const paymentState = await getBookingPaymentStateFromDb(booking.id, {
      totalAmount: booking.totalAmount,
      depositAmount: booking.depositAmount,
      status: booking.status,
    });
    depositSatisfied = paymentState.depositSatisfied;
  }

  if (
    !canCustomerReviewBooking({
      status: booking.status,
      scheduledDate: booking.scheduledDate,
      depositSatisfied,
      hasReview: Boolean(booking.review),
    })
  ) {
    return {
      ok: false,
      error: "You can leave a review after your service date, once the appointment has taken place.",
    };
  }

  if (booking.review) {
    return { ok: false, error: "You already reviewed this booking." };
  }

  await prisma.review.create({
    data: {
      userId: user.id,
      bookingId: booking.id,
      rating: parsed.data.rating,
      body: parsed.data.body,
      status: "PENDING",
      featured: false,
    },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.id}`);
  revalidatePath("/admin/reviews");

  return { ok: true };
}
