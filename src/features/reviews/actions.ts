"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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

  if (booking.status !== "COMPLETED") {
    return { ok: false, error: "You can review a booking after the service is completed." };
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
