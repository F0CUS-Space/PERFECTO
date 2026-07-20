"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { requireUser, UnauthorizedError } from "@/server/rbac";

import { getScheduleAvailabilityError, toScheduleDateString } from "@/features/booking/services/schedule-availability";
import { createBookingSchema } from "./schema";

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

/** Creates a booking with agreement snapshot; deposit payment is handled in M5. */
export async function createBooking(raw: unknown): Promise<CreateBookingResult> {
  try {
    const user = await requireUser();

    const userLimit = await rateLimit(`create-booking:${user.id}`, 10, 10 * 60 * 1000);
    if (!userLimit.ok) {
      return {
        ok: false,
        error: "Too many booking attempts. Please wait a few minutes and try again.",
      };
    }
    const ipLimit = await rateLimit(`create-booking-ip:${await getClientIp()}`, 20, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return {
        ok: false,
        error: "Too many booking attempts. Please wait a few minutes and try again.",
      };
    }

    const input = createBookingSchema.parse(raw);

    const availabilityError = await getScheduleAvailabilityError(
      toScheduleDateString(input.scheduledDate),
      input.arrivalWindow,
    );
    if (availabilityError) {
      return { ok: false, error: availabilityError };
    }

    const quote = await prisma.quote.findUnique({
      where: { id: input.quoteId },
      include: {
        service: true,
        promotion: { select: { id: true, title: true } },
        addOns: { include: { addOn: true } },
        booking: { select: { id: true } },
      },
    });

    if (!quote) {
      return { ok: false, error: "Quote not found. Please get a new estimate." };
    }

    if (quote.booking) {
      return { ok: false, error: "This quote has already been used for a booking." };
    }

    if (quote.userId && quote.userId !== user.id) {
      return { ok: false, error: "This quote belongs to another account." };
    }

    const stagingPrefix = `bookings/staging/${user.id}/`;
    if (input.photos.some((photo) => !photo.s3Key.startsWith(stagingPrefix))) {
      return { ok: false, error: "One or more photos are invalid. Please re-upload and try again." };
    }

    const depositAmount = quote.estimatedTotal;
    const balanceAmount = 0;

    const breakdown = quote.breakdown as { serviceDetails?: Record<string, unknown> } | null;
    const serviceDetails = breakdown?.serviceDetails;
    let specialInstructions = input.specialInstructions?.trim() ?? "";

    if (serviceDetails?.workstations) {
      const prefix = `Workstations: ${serviceDetails.workstations}.`;
      specialInstructions = specialInstructions
        ? `${prefix}\n${specialInstructions}`
        : prefix;
    }
    if (serviceDetails?.furnished) {
      const prefix = `Property condition: ${serviceDetails.furnished}.`;
      specialInstructions = specialInstructions
        ? `${prefix}\n${specialInstructions}`
        : prefix;
    }

    const ipAddress = await getClientIp();
    const ipForAgreement = ipAddress === "unknown" ? null : ipAddress;

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          userId: user.id,
          serviceId: quote.serviceId,
          quoteId: quote.id,
          scheduledDate: input.scheduledDate,
          arrivalWindow: input.arrivalWindow,
          status: "PENDING_PAYMENT",
          addressLine: input.addressLine.trim(),
          city: input.city.trim(),
          postalCode: input.postalCode.trim(),
          bedrooms: quote.bedrooms,
          bathrooms: quote.bathrooms,
          propertySize: quote.propertySize,
          hasPets: quote.hasPets,
          petNotes: input.petNotes?.trim() || null,
          accessInfo: input.accessInfo?.trim() || null,
          specialInstructions: specialInstructions || null,
          totalAmount: quote.estimatedTotal,
          depositAmount,
          balanceAmount,
          promotionId: quote.promotionId,
          promotionTitle: quote.promotion?.title ?? null,
          promotionDiscountCents: quote.promotionDiscountCents,
        },
      });

      if (input.photos.length > 0) {
        await tx.propertyPhoto.createMany({
          data: input.photos.map((photo) => ({
            bookingId: created.id,
            s3Key: photo.s3Key,
            url: photo.url,
          })),
        });
      }

      await tx.agreement.create({
        data: {
          userId: user.id,
          bookingId: created.id,
          acceptedTerms: input.agreement.acceptedTerms,
          acceptedCancellation: input.agreement.acceptedCancellation,
          acceptedLiability: input.agreement.acceptedLiability,
          signatureName: input.agreement.signatureName.trim(),
          ipAddress: ipForAgreement,
        },
      });

      // Payment rows are created per checkout attempt in createDepositCheckout,
      // so we intentionally do NOT create a pending payment here (avoids an orphan row).

      if (!quote.userId) {
        await tx.quote.update({
          where: { id: quote.id },
          data: { userId: user.id },
        });
      }

      return created;
    });

    return { ok: true, bookingId: booking.id };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        ok: false,
        error: "Your session expired. Please sign in again to complete your booking.",
      };
    }
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.errors[0]?.message ?? "Invalid booking details." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "This quote has already been used for a booking." };
    }
    console.error("[createBooking]", error);
    return { ok: false, error: "Unable to create your booking. Please try again." };
  }
}
