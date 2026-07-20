"use server";

import type { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { requireAdmin, requireUser, UnauthorizedError, ForbiddenError } from "@/server/rbac";
import { logAdminAction } from "@/features/admin/audit-log";
import {
  getScheduleAvailabilityError,
  toScheduleDateString,
} from "@/features/booking/services/schedule-availability";

import { estimateOfferEmail } from "./emails/estimate-email";
import { completeBookingOfferSchema, createBookingOfferSchema } from "./schema";
import { isOfferExpired, parseBreakdown, searchEstimateCustomers } from "./queries";
import type { OfferBreakdown } from "./types";

export type EstimateActionResult =
  | { ok: true; offerId?: string; emailed?: boolean; emailSkipped?: boolean; checkoutUrl?: string; bookingId?: string }
  | { ok: false; error: string; offerId?: string };

const OFFER_TTL_DAYS = 14;

function generateOfferToken(): string {
  return randomBytes(32).toString("base64url");
}

function computeTotal(servicePriceCents: number, lines: { priceCents: number }[]): number {
  return servicePriceCents + lines.reduce((sum, line) => sum + line.priceCents, 0);
}

function buildBreakdown(
  servicePriceCents: number,
  lines: { addOnId?: string | null; name: string; priceCents: number }[],
): OfferBreakdown {
  return {
    servicePriceCents,
    lines: lines.map((line) => ({
      addOnId: line.addOnId ?? null,
      name: line.name.trim(),
      priceCents: line.priceCents,
    })),
  };
}

function resolveRecipientEmail(input: {
  customerEmail?: string | null;
  taggedUserEmail?: string | null;
}): string | null {
  const direct = input.customerEmail?.trim();
  if (direct) return direct;
  const tagged = input.taggedUserEmail?.trim();
  return tagged || null;
}

function payLinkUrl(token: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/book/offer/${token}`;
}

async function sendEstimateEmail(offerId: string): Promise<EstimateActionResult> {
  const limit = await rateLimit(`estimate-send:${await getClientIp()}`, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return {
      ok: false,
      error: "Too many estimate emails sent. Please wait a few minutes and try again.",
    };
  }

  const offer = await prisma.bookingOffer.findUnique({
    where: { id: offerId },
    include: {
      user: { select: { email: true } },
    },
  });

  if (!offer) return { ok: false, error: "Estimate not found." };

  if (offer.status === "CANCELLED") {
    return { ok: false, error: "This estimate was cancelled." };
  }
  if (offer.status === "CONVERTED") {
    return { ok: false, error: "This estimate was already converted to a booking." };
  }
  if (isOfferExpired(offer.status, offer.expiresAt)) {
    await prisma.bookingOffer.update({
      where: { id: offer.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, error: "This estimate has expired." };
  }

  const to = resolveRecipientEmail({
    customerEmail: offer.customerEmail,
    taggedUserEmail: offer.user?.email,
  });

  if (!to) {
    return {
      ok: false,
      error: "An email address is required to send the estimate. Add an email or tag a customer who has one on file.",
    };
  }

  const breakdown = parseBreakdown(offer.breakdown);
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const { subject, html } = estimateOfferEmail({
    customerName: offer.customerName,
    serviceName: offer.serviceName,
    totalAmount: offer.totalAmount,
    breakdown,
    messageToCustomer: offer.messageToCustomer,
    expiresAt: offer.expiresAt,
    payLinkUrl: payLinkUrl(offer.token),
    appUrl,
  });

  const sendResult = await sendEmail({ to, subject, html });

  await prisma.bookingOffer.update({
    where: { id: offer.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      customerEmail: offer.customerEmail ?? to,
    },
  });

  return {
    ok: true,
    offerId: offer.id,
    emailed: !sendResult.skipped,
    emailSkipped: sendResult.skipped,
  };
}

export async function searchCustomersForEstimate(q: string) {
  await requireAdmin();
  return searchEstimateCustomers(q);
}

export async function createBookingOffer(raw: unknown): Promise<EstimateActionResult> {
  try {
    const admin = await requireAdmin();
    const input = createBookingOfferSchema.parse(raw);

    const service = await prisma.service.findUnique({
      where: { id: input.serviceId },
      select: { id: true, name: true, isActive: true },
    });

    if (!service || !service.isActive) {
      return { ok: false, error: "Select an active service." };
    }

    let taggedUser: { id: string; email: string | null; phone: string; firstName: string | null; lastName: string | null } | null =
      null;

    if (input.userId) {
      taggedUser = await prisma.user.findFirst({
        where: { id: input.userId, role: "CUSTOMER" },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
        },
      });
      if (!taggedUser) {
        return { ok: false, error: "Tagged customer was not found." };
      }
    }

    const customerEmail =
      (typeof input.customerEmail === "string" && input.customerEmail.trim()) ||
      taggedUser?.email ||
      null;
    const customerPhone =
      (typeof input.customerPhone === "string" && input.customerPhone.trim()) ||
      taggedUser?.phone ||
      null;

    const breakdown = buildBreakdown(input.servicePriceCents, input.lines);
    const totalAmount = computeTotal(breakdown.servicePriceCents, breakdown.lines);

    if (totalAmount <= 0) {
      return { ok: false, error: "Total must be greater than zero." };
    }

    if (input.sendNow) {
      const recipient = resolveRecipientEmail({
        customerEmail,
        taggedUserEmail: taggedUser?.email,
      });
      if (!recipient) {
        return {
          ok: false,
          error: "An email address is required to send the estimate.",
        };
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + OFFER_TTL_DAYS);

    const offer = await prisma.bookingOffer.create({
      data: {
        token: generateOfferToken(),
        status: "DRAFT",
        userId: taggedUser?.id ?? null,
        customerName: input.customerName.trim(),
        customerEmail,
        customerPhone,
        serviceId: service.id,
        serviceName: service.name,
        totalAmount,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
        staffNotes: input.staffNotes?.trim() || null,
        messageToCustomer: input.messageToCustomer?.trim() || null,
        createdById: admin.id,
        expiresAt,
      },
    });

    await logAdminAction({
      actorId: admin.id,
      action: "ESTIMATE_CREATE",
      entityType: "booking_offer",
      entityId: offer.id,
      summary: `Created estimate for ${offer.customerName} — ${offer.serviceName}`,
      metadata: { totalAmount: offer.totalAmount, sendNow: input.sendNow },
    });

    revalidatePath("/admin/estimates");

    if (!input.sendNow) {
      return { ok: true, offerId: offer.id };
    }

    const sendResult = await sendEstimateEmail(offer.id);
    if (!sendResult.ok) {
      return { ok: false, error: sendResult.error, offerId: offer.id };
    }

    await logAdminAction({
      actorId: admin.id,
      action: "ESTIMATE_SEND",
      entityType: "booking_offer",
      entityId: offer.id,
      summary: `Sent estimate to ${offer.customerName}`,
      metadata: { emailed: sendResult.emailed, emailSkipped: sendResult.emailSkipped },
    });

    revalidatePath("/admin/estimates");
    revalidatePath(`/admin/estimates/${offer.id}`);

    return { ok: true, offerId: offer.id, emailed: sendResult.emailed, emailSkipped: sendResult.emailSkipped };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof ZodError) {
      return { ok: false, error: error.errors[0]?.message ?? "Invalid estimate details." };
    }
    console.error("[createBookingOffer]", error);
    return { ok: false, error: "Could not create the estimate. Please try again." };
  }
}

export async function sendBookingOffer(offerId: string): Promise<EstimateActionResult> {
  try {
    const admin = await requireAdmin();
    const sendResult = await sendEstimateEmail(offerId);
    if (!sendResult.ok) return sendResult;

    await logAdminAction({
      actorId: admin.id,
      action: "ESTIMATE_SEND",
      entityType: "booking_offer",
      entityId: offerId,
      summary: `Sent / resent estimate ${offerId}`,
      metadata: { emailed: sendResult.emailed, emailSkipped: sendResult.emailSkipped },
    });

    revalidatePath("/admin/estimates");
    revalidatePath(`/admin/estimates/${offerId}`);

    return sendResult;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return { ok: false, error: error.message };
    }
    console.error("[sendBookingOffer]", error);
    return { ok: false, error: "Could not send the estimate email." };
  }
}

export async function cancelBookingOffer(offerId: string): Promise<EstimateActionResult> {
  try {
    const admin = await requireAdmin();

    const offer = await prisma.bookingOffer.findUnique({ where: { id: offerId } });
    if (!offer) return { ok: false, error: "Estimate not found." };
    if (offer.status === "CONVERTED") {
      return { ok: false, error: "Converted estimates cannot be cancelled." };
    }
    if (offer.status === "CANCELLED") {
      return { ok: true, offerId };
    }

    await prisma.bookingOffer.update({
      where: { id: offerId },
      data: { status: "CANCELLED" },
    });

    await logAdminAction({
      actorId: admin.id,
      action: "ESTIMATE_CANCEL",
      entityType: "booking_offer",
      entityId: offerId,
      summary: `Cancelled estimate for ${offer.customerName}`,
    });

    revalidatePath("/admin/estimates");
    revalidatePath(`/admin/estimates/${offerId}`);

    return { ok: true, offerId };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return { ok: false, error: error.message };
    }
    console.error("[cancelBookingOffer]", error);
    return { ok: false, error: "Could not cancel the estimate." };
  }
}

export async function completeBookingOffer(raw: unknown): Promise<EstimateActionResult> {
  try {
    const user = await requireUser();
    const input = completeBookingOfferSchema.parse(raw);

    const availabilityError = await getScheduleAvailabilityError(
      toScheduleDateString(input.scheduledDate),
      input.arrivalWindow,
    );
    if (availabilityError) {
      return { ok: false, error: availabilityError };
    }

    const offer = await prisma.bookingOffer.findUnique({
      where: { token: input.token },
    });

    if (!offer) {
      return { ok: false, error: "This estimate link is invalid." };
    }

    if (offer.status === "CANCELLED") {
      return { ok: false, error: "This estimate was cancelled." };
    }
    if (offer.status === "CONVERTED" || offer.bookingId) {
      return { ok: false, error: "This estimate has already been used." };
    }
    if (offer.status === "DRAFT") {
      return { ok: false, error: "This estimate has not been sent yet." };
    }
    if (isOfferExpired(offer.status, offer.expiresAt) || offer.status === "EXPIRED") {
      if (offer.status !== "EXPIRED") {
        await prisma.bookingOffer.update({
          where: { id: offer.id },
          data: { status: "EXPIRED" },
        });
      }
      return { ok: false, error: "This estimate has expired. Please contact us for a new one." };
    }

    if (offer.userId && offer.userId !== user.id) {
      return {
        ok: false,
        error: "This estimate was prepared for a different account. Sign in with the correct phone number.",
      };
    }

    const ipAddress = await getClientIp();
    const ipForAgreement = ipAddress === "unknown" ? null : ipAddress;

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          userId: user.id,
          serviceId: offer.serviceId,
          scheduledDate: input.scheduledDate,
          arrivalWindow: input.arrivalWindow,
          status: "PENDING_PAYMENT",
          addressLine: input.addressLine.trim(),
          city: input.city.trim(),
          postalCode: input.postalCode.trim(),
          bedrooms: 0,
          bathrooms: 0,
          propertySize: null,
          hasPets: false,
          petNotes: input.petNotes?.trim() || null,
          accessInfo: input.accessInfo?.trim() || null,
          specialInstructions: input.specialInstructions?.trim() || null,
          totalAmount: offer.totalAmount,
          depositAmount: offer.totalAmount,
          balanceAmount: 0,
        },
      });

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

      const converted = await tx.bookingOffer.updateMany({
        where: { id: offer.id, bookingId: null, status: { in: ["SENT"] } },
        data: {
          status: "CONVERTED",
          bookingId: created.id,
          userId: offer.userId ?? user.id,
        },
      });
      if (converted.count === 0) {
        throw new Error("ESTIMATE_ALREADY_USED");
      }

      return created;
    });

    // Checkout is started by the client (same as self-serve booking) so we never
    // nest Server Actions — that path can return a Stripe URL without persisting
    // the local payment↔session link, which blocks webhook/redirect confirmation.
    return { ok: true, bookingId: booking.id };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, error: "Please sign in to complete this estimate." };
    }
    if (error instanceof ZodError) {
      return { ok: false, error: error.errors[0]?.message ?? "Check your booking details." };
    }
    if (error instanceof Error && error.message === "ESTIMATE_ALREADY_USED") {
      return { ok: false, error: "This estimate has already been used." };
    }
    console.error("[completeBookingOffer]", error);
    return { ok: false, error: "Could not complete booking. Please try again." };
  }
}
