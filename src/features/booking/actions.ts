"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/rbac";

import { getScheduleAvailabilityError, toScheduleDateString } from "@/features/booking/services/schedule-availability";
import { createBookingSchema } from "./schema";

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

async function getClientIp(): Promise<string | undefined> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    undefined
  );
}

/** Creates a booking with agreement snapshot; deposit payment is handled in M5. */
export async function createBooking(raw: unknown): Promise<CreateBookingResult> {
  try {
    const user = await requireUser();
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
          ipAddress: ipAddress ?? null,
        },
      });

      await tx.payment.create({
        data: {
          bookingId: created.id,
          type: "DEPOSIT",
          amount: depositAmount,
          status: "PENDING",
        },
      });

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
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.errors[0]?.message ?? "Invalid booking details." };
    }
    console.error("[createBooking]", error);
    return { ok: false, error: "Unable to create your booking. Please try again." };
  }
}
