"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { BookingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/rbac";

const bookingStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

const serviceUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(10).max(2000),
  basePriceDollars: z.coerce.number().min(0).max(100000),
  isActive: z.boolean(),
  isPopular: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export type AdminActionResult = { ok: true } | { ok: false; error: string };

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = bookingStatusSchema.safeParse(status);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status." };
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: parsed.data },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function updateService(
  serviceId: string,
  input: z.infer<typeof serviceUpdateSchema>,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = serviceUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return { ok: false, error: "Service not found." };
  }

  const { name, description, basePriceDollars, isActive, isPopular, sortOrder } = parsed.data;

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      name,
      description,
      basePrice: Math.round(basePriceDollars * 100),
      isActive,
      isPopular,
      sortOrder,
    },
  });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/book");

  return { ok: true };
}
