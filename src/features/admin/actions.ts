"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ApplicationStatus, BookingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { env } from "@/env";
import {
  invalidateCatalogCache,
  invalidateGalleryCache,
  invalidatePromotionsCache,
} from "@/lib/cache";
import { parseScheduleDate } from "@/config/booking";
import {
  adminAccessGrantedEmail,
  adminAccessRevokedEmail,
} from "@/features/admin/emails/role-change-emails";
import {
  applicationAcceptedEmail,
  applicationRejectedEmail,
  applicationUnderReviewEmail,
} from "@/features/recruitment/emails";
import { requireAdmin } from "@/server/rbac";
import { logAdminAction } from "@/features/admin/audit-log";
import { refundBookingPayment } from "@/features/payments/services/refunds";
import {
  reconcileBookingPayments,
  voidPendingCheckoutAttempts,
} from "@/features/payments/services/reconcile-payments";
import {
  notifyCustomersPromotion,
  notifyCustomersServiceUpdate,
} from "@/features/notifications/create-notifications";
import { slugifyServiceName } from "@/features/admin/service-slug";
import { EMPLOYMENT_TYPES, JOB_LOCATIONS } from "@/features/recruitment/job-options";
import { isAllowedMediaRef } from "@/lib/media-ref";
import { deleteObject, deleteOwnedObjectBestEffort } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";

const bookingStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

const serviceImageRef = z
  .string()
  .trim()
  .refine((val) => isAllowedMediaRef(val), {
    message: "Image must be a local path, S3 key, or URL to your S3 bucket.",
  })
  .optional()
  .or(z.literal(""));

const serviceUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(10).max(2000),
  longDescription: z.string().max(5000).optional().or(z.literal("")),
  includes: z.array(z.string().trim().min(1).max(200)).max(25).default([]),
  idealFor: z.array(z.string().trim().min(1).max(100)).max(15).default([]),
  pricingNote: z.string().max(1000).optional().or(z.literal("")),
  basePriceDollars: z.coerce.number().min(0).max(100000),
  isActive: z.boolean(),
  isPopular: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  imageUrl: serviceImageRef,
});

const serviceCreateSchema = serviceUpdateSchema
  .omit({ sortOrder: true })
  .extend({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
      .optional()
      .or(z.literal("")),
    sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  });

const addOnSchema = z.object({
  name: z.string().min(2).max(120),
  priceDollars: z.coerce.number().min(0).max(10000),
  isActive: z.boolean(),
});

function revalidateAuditLogPath() {
  revalidatePath("/admin/audit-log");
}

async function revalidateCatalogPaths(serviceId?: string, slug?: string) {
  revalidatePath("/admin/services");
  if (serviceId) revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/add-ons");
  revalidatePath("/services");
  if (slug) revalidatePath(`/services/${slug}`);
  revalidatePath("/book");
  await invalidateCatalogCache();
}

function revalidateJobPaths(jobId?: string) {
  revalidatePath("/admin/jobs");
  if (jobId) revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath("/careers");
  revalidatePath("/careers/apply");
}

async function resolveUniqueJobSlug(preferred: string): Promise<string> {
  const slug = preferred;
  let suffix = 0;
  while (suffix < 1000) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.jobPosting.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix += 1;
  }
  throw new Error("Unable to allocate a unique job slug.");
}

async function resolveUniqueSlug(preferred: string): Promise<string> {
  const slug = preferred;
  let suffix = 0;
  while (suffix < 1000) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.service.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix += 1;
  }
  throw new Error("Unable to allocate a unique service slug.");
}

import { maybeSendBookingCompletionEmail } from "@/features/notifications/send-booking-completion";

export type AdminActionResult =
  | { ok: true; serviceId?: string; deactivated?: boolean; notified?: boolean; emailFailed?: boolean; emailed?: boolean }
  | { ok: false; error: string };

export interface TeamMemberLookup {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  role: "ADMIN" | "CUSTOMER";
  bookingCount: number;
  createdAt: string;
}

export type TeamLookupResult =
  | { ok: true; status: "found"; user: TeamMemberLookup }
  | { ok: true; status: "not_found" }
  | { ok: false; error: string };

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function toTeamMemberLookup(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  role: "ADMIN" | "CUSTOMER";
  createdAt: Date;
  _count: { bookings: number };
}): TeamMemberLookup {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    bookingCount: user._count.bookings,
    createdAt: user.createdAt.toISOString(),
  };
}

function pickBestPhoneMatch(
  users: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string;
    email: string | null;
    role: "ADMIN" | "CUSTOMER";
    createdAt: Date;
    _count: { bookings: number };
  }[],
  digits: string,
  trimmedQuery: string,
): TeamMemberLookup | null {
  if (users.length === 0) return null;

  const ranked = [...users].sort((a, b) => {
    const da = phoneDigits(a.phone);
    const db = phoneDigits(b.phone);
    if (a.phone === trimmedQuery || da === digits) return -1;
    if (b.phone === trimmedQuery || db === digits) return 1;
    if (da.startsWith(digits) && !db.startsWith(digits)) return -1;
    if (db.startsWith(digits) && !da.startsWith(digits)) return 1;
    return da.length - db.length;
  });

  return toTeamMemberLookup(ranked[0]!);
}

async function sendRoleChangeEmail(
  user: { email: string | null; firstName: string | null; lastName: string | null },
  granted: boolean,
): Promise<boolean> {
  if (!user.email) return false;

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "there";
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  try {
    const result = await sendEmail({
      to: user.email,
      subject: granted
        ? "You now have admin access — Perfecto Cleaning Services"
        : "Your admin access has been updated — Perfecto Cleaning Services",
      html: granted
        ? adminAccessGrantedEmail({ name, appUrl })
        : adminAccessRevokedEmail({ name, appUrl }),
    });
    return !result.skipped;
  } catch (error) {
    console.error("[team] role change email failed", error);
    return false;
  }
}

/** Live lookup while admin types a phone number. */
export async function lookupUserForTeamAccess(phoneQuery: string): Promise<TeamLookupResult> {
  await requireAdmin();

  const trimmed = phoneQuery.trim();
  const digits = phoneDigits(trimmed);
  if (digits.length < 4) {
    return { ok: true, status: "not_found" };
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { contains: trimmed } },
        { phone: { contains: digits } },
      ],
    },
    include: { _count: { select: { bookings: true } } },
    take: 10,
  });

  const match = pickBestPhoneMatch(users, digits, trimmed);
  if (!match) {
    return { ok: true, status: "not_found" };
  }

  return { ok: true, status: "found", user: match };
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = bookingStatusSchema.safeParse(status);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status." };
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  const previousStatus = booking.status;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: parsed.data },
  });

  if (parsed.data === "CANCELLED" && previousStatus !== "CANCELLED") {
    await voidPendingCheckoutAttempts(bookingId).catch((error) => {
      console.error("[updateBookingStatus] void checkout failed", bookingId, error);
    });
  }

  let emailFailed = false;
  if (parsed.data === "COMPLETED" && previousStatus !== "COMPLETED") {
    const emailResult = await maybeSendBookingCompletionEmail(bookingId);
    if (!emailResult.sent && emailResult.reason !== "already_sent" && emailResult.reason !== "no_customer_email") {
      emailFailed = emailResult.reason === "send_failed" || emailResult.reason === "email_not_configured";
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/dashboard");

  await logAdminAction({
    actorId: admin.id,
    action: "BOOKING_STATUS_UPDATE",
    entityType: "booking",
    entityId: bookingId,
    summary: `Changed booking status from ${previousStatus.replace(/_/g, " ").toLowerCase()} to ${parsed.data.replace(/_/g, " ").toLowerCase()}`,
    metadata: { previousStatus, newStatus: parsed.data },
  });
  revalidateAuditLogPath();

  return { ok: true, notified: parsed.data === "COMPLETED", emailFailed };
}

const refundPaymentSchema = z.object({
  bookingId: z.string().min(1),
  /** Dollar amount to refund. Omit to refund the full captured amount. */
  amountDollars: z.coerce.number().positive().max(1_000_000).optional(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function refundPayment(
  input: z.infer<typeof refundPaymentSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = refundPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid refund request." };
  }

  const { bookingId, amountDollars, reason } = parsed.data;
  const amountCents = amountDollars !== undefined ? Math.round(amountDollars * 100) : undefined;

  const result = await refundBookingPayment({
    bookingId,
    amountCents,
    reason: reason || undefined,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/dashboard");

  await logAdminAction({
    actorId: admin.id,
    action: "PAYMENT_REFUND",
    entityType: "booking",
    entityId: bookingId,
    summary: `Refunded ${formatRefundAmount(result.refundedCents)}${reason ? ` — ${reason}` : ""}`,
    metadata: { refundedCents: result.refundedCents, reason: reason || null },
  });
  revalidateAuditLogPath();

  return { ok: true };
}

function formatRefundAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export async function voidCheckoutAttempts(bookingId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  if (!bookingId) {
    return { ok: false, error: "Missing booking id." };
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  let voided: number;
  try {
    voided = await voidPendingCheckoutAttempts(bookingId);
  } catch (error) {
    console.error("[voidCheckoutAttempts]", bookingId, error);
    return { ok: false, error: "Could not void the checkout attempts. Please try again." };
  }

  if (voided === 0) {
    return { ok: false, error: "No open checkout attempts to void." };
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);

  await logAdminAction({
    actorId: admin.id,
    action: "CHECKOUT_ATTEMPT_VOID",
    entityType: "booking",
    entityId: bookingId,
    summary: `Voided ${voided} pending checkout ${voided === 1 ? "attempt" : "attempts"}`,
    metadata: { voided },
  });
  revalidateAuditLogPath();

  return { ok: true };
}

/**
 * Manual Stripe reconcile for orphaned paid Checkout Sessions / missed webhooks.
 * Safe to run repeatedly; uses linked sessions + PaymentIntent metadata search.
 */
export async function reconcileBookingPayment(bookingId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  if (!bookingId) {
    return { ok: false, error: "Missing booking id." };
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  let result;
  try {
    result = await reconcileBookingPayments(bookingId);
  } catch (error) {
    console.error("[reconcileBookingPayment]", bookingId, error);
    return { ok: false, error: "Could not reconcile payment. Please try again." };
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath(`/book/confirmation/${bookingId}`);

  if (result.newlyConfirmed) {
    await logAdminAction({
      actorId: admin.id,
      action: "BOOKING_STATUS_UPDATE",
      entityType: "booking",
      entityId: bookingId,
      summary: "Reconciled Stripe payment and confirmed booking",
      metadata: {
        amountPaid: result.amountPaid,
        depositSatisfied: result.depositSatisfied,
        newlyConfirmed: true,
      },
    });
    revalidateAuditLogPath();
  }

  if (result.depositSatisfied || result.bookingConfirmed) {
    return { ok: true };
  }

  return {
    ok: false,
    error: "No paid Stripe capture found for this booking yet.",
  };
}

export async function updateService(
  serviceId: string,
  input: z.infer<typeof serviceUpdateSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = serviceUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return { ok: false, error: "Service not found." };
  }

  const { name, description, longDescription, includes, idealFor, pricingNote, basePriceDollars, isActive, isPopular, sortOrder, imageUrl } =
    parsed.data;

  const nextImageUrl = imageUrl?.trim() ? imageUrl.trim() : null;
  const previousImageUrl = service.imageUrl;

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      name,
      description,
      longDescription: longDescription?.trim() || null,
      includes,
      idealFor,
      pricingNote: pricingNote?.trim() || null,
      basePrice: Math.round(basePriceDollars * 100),
      isActive,
      isPopular,
      sortOrder,
      imageUrl: nextImageUrl,
    },
  });

  if (previousImageUrl && previousImageUrl !== nextImageUrl) {
    await deleteOwnedObjectBestEffort(previousImageUrl, "updateService");
  }

  await revalidateCatalogPaths(serviceId, service.slug);

  await logAdminAction({
    actorId: admin.id,
    action: "SERVICE_UPDATE",
    entityType: "service",
    entityId: serviceId,
    summary: `Updated service "${name}"`,
    metadata: { slug: service.slug },
  });
  revalidateAuditLogPath();

  if (isActive) {
    await notifyCustomersServiceUpdate({
      serviceName: name,
      slug: service.slug,
    });
  }

  return { ok: true };
}

export async function createService(
  input: z.infer<typeof serviceCreateSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = serviceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const { name, description, longDescription, includes, idealFor, pricingNote, basePriceDollars, isActive, isPopular, sortOrder, imageUrl, slug } =
    parsed.data;

  const baseSlug = slug?.trim() || slugifyServiceName(name);
  if (!baseSlug) {
    return { ok: false, error: "Could not generate a URL slug from the service name." };
  }

  const uniqueSlug = await resolveUniqueSlug(baseSlug);

  const maxSort = await prisma.service.aggregate({ _max: { sortOrder: true } });
  const nextSort = sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1;

  const service = await prisma.service.create({
    data: {
      slug: uniqueSlug,
      name,
      description,
      longDescription: longDescription?.trim() || null,
      includes,
      idealFor,
      pricingNote: pricingNote?.trim() || null,
      basePrice: Math.round(basePriceDollars * 100),
      isActive,
      isPopular,
      sortOrder: nextSort,
      imageUrl: imageUrl?.trim() ? imageUrl.trim() : null,
    },
  });

  await revalidateCatalogPaths(service.id, service.slug);

  await logAdminAction({
    actorId: admin.id,
    action: "SERVICE_CREATE",
    entityType: "service",
    entityId: service.id,
    summary: `Created service "${service.name}"`,
    metadata: { slug: service.slug },
  });
  revalidateAuditLogPath();

  await notifyCustomersServiceUpdate({
    serviceName: service.name,
    slug: service.slug,
    created: true,
  });

  return { ok: true, serviceId: service.id };
}

export async function deleteService(serviceId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      _count: { select: { bookings: true, quotes: true, bookingOffers: true } },
      bookings: {
        select: {
          id: true,
          photos: { select: { s3Key: true } },
        },
      },
    },
  });

  if (!service) {
    return { ok: false, error: "Service not found." };
  }

  const hasHistory =
    service._count.bookings > 0 ||
    service._count.quotes > 0 ||
    service._count.bookingOffers > 0;

  // Active services with history stay soft-deactivated so live catalog ops remain safe.
  if (service.isActive && hasHistory) {
    await prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false, isPopular: false },
    });
    await revalidateCatalogPaths(serviceId);
    await logAdminAction({
      actorId: admin.id,
      action: "SERVICE_DELETE",
      entityType: "service",
      entityId: serviceId,
      summary: `Deactivated service "${service.name}" (has booking history)`,
      metadata: { slug: service.slug, deactivated: true },
    });
    revalidateAuditLogPath();
    return { ok: true, deactivated: true };
  }

  // Inactive (legacy) services — or active services with no dependents — can be hard-deleted.
  // Explicit order: offers → bookings (cascades photos/payments/invoice/agreement/review) → quotes → service
  // (AddOnOnService / PromotionOnService cascade from Service).
  const bookingIds = service.bookings.map((b) => b.id);
  const photoKeys = service.bookings.flatMap((b) => b.photos.map((p) => p.s3Key));

  await prisma.$transaction(async (tx) => {
    await tx.bookingOffer.deleteMany({
      where: {
        OR: [{ serviceId }, ...(bookingIds.length > 0 ? [{ bookingId: { in: bookingIds } }] : [])],
      },
    });
    await tx.booking.deleteMany({ where: { serviceId } });
    await tx.quote.deleteMany({ where: { serviceId } });
    await tx.service.delete({ where: { id: serviceId } });
  });

  await deleteOwnedObjectBestEffort(service.imageUrl, "deleteService");
  await Promise.all(photoKeys.map((key) => deleteOwnedObjectBestEffort(key, "deleteService")));

  await revalidateCatalogPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "SERVICE_DELETE",
    entityType: "service",
    entityId: serviceId,
    summary: `Deleted service "${service.name}"`,
    metadata: {
      slug: service.slug,
      hardDeleted: true,
      bookingsRemoved: service._count.bookings,
      quotesRemoved: service._count.quotes,
    },
  });
  revalidateAuditLogPath();
  return { ok: true };
}

export async function setServiceAddOns(
  serviceId: string,
  addOnIds: string[],
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return { ok: false, error: "Service not found." };
  }

  const validAddOns = await prisma.addOn.findMany({
    where: { id: { in: addOnIds }, isActive: true },
    select: { id: true },
  });
  const validIds = validAddOns.map((a) => a.id);

  await prisma.$transaction([
    prisma.addOnOnService.deleteMany({ where: { serviceId } }),
    ...validIds.map((addOnId) =>
      prisma.addOnOnService.create({ data: { serviceId, addOnId } }),
    ),
  ]);

  await revalidateCatalogPaths(serviceId);

  await logAdminAction({
    actorId: admin.id,
    action: "SERVICE_ADDONS_UPDATE",
    entityType: "service",
    entityId: serviceId,
    summary: `Updated add-ons for "${service.name}" (${validIds.length} linked)`,
    metadata: { addOnIds: validIds },
  });
  revalidateAuditLogPath();

  return { ok: true };
}

export async function createAddOn(
  input: z.infer<typeof addOnSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = addOnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.addOn.findFirst({ where: { name: parsed.data.name } });
  if (existing) {
    return { ok: false, error: "An add-on with this name already exists." };
  }

  await prisma.addOn.create({
    data: {
      name: parsed.data.name,
      price: Math.round(parsed.data.priceDollars * 100),
      isActive: parsed.data.isActive,
    },
  });

  await revalidateCatalogPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "ADDON_CREATE",
    entityType: "addon",
    summary: `Created add-on "${parsed.data.name}"`,
    metadata: { name: parsed.data.name },
  });
  revalidateAuditLogPath();
  return { ok: true };
}

export async function updateAddOn(
  addOnId: string,
  input: z.infer<typeof addOnSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = addOnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const addOn = await prisma.addOn.findUnique({ where: { id: addOnId } });
  if (!addOn) {
    return { ok: false, error: "Add-on not found." };
  }

  const duplicate = await prisma.addOn.findFirst({
    where: { name: parsed.data.name, NOT: { id: addOnId } },
  });
  if (duplicate) {
    return { ok: false, error: "Another add-on already uses this name." };
  }

  await prisma.addOn.update({
    where: { id: addOnId },
    data: {
      name: parsed.data.name,
      price: Math.round(parsed.data.priceDollars * 100),
      isActive: parsed.data.isActive,
    },
  });

  await revalidateCatalogPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "ADDON_UPDATE",
    entityType: "addon",
    entityId: addOnId,
    summary: `Updated add-on "${parsed.data.name}"`,
  });
  revalidateAuditLogPath();
  return { ok: true };
}

export async function deleteAddOn(addOnId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const addOn = await prisma.addOn.findUnique({
    where: { id: addOnId },
    include: { _count: { select: { services: true, quoteItems: true } } },
  });

  if (!addOn) {
    return { ok: false, error: "Add-on not found." };
  }

  const hasHistory = addOn._count.services > 0 || addOn._count.quoteItems > 0;

  if (hasHistory) {
    await prisma.addOn.update({
      where: { id: addOnId },
      data: { isActive: false },
    });
    await revalidateCatalogPaths();
    await logAdminAction({
      actorId: admin.id,
      action: "ADDON_DELETE",
      entityType: "addon",
      entityId: addOnId,
      summary: `Deactivated add-on "${addOn.name}" (in use)`,
      metadata: { deactivated: true },
    });
    revalidateAuditLogPath();
    return { ok: true, deactivated: true };
  }

  await prisma.addOn.delete({ where: { id: addOnId } });
  await revalidateCatalogPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "ADDON_DELETE",
    entityType: "addon",
    entityId: addOnId,
    summary: `Deleted add-on "${addOn.name}"`,
  });
  revalidateAuditLogPath();
  return { ok: true };
}

const applicationStatusSchema = z.enum(["UNDER_REVIEW", "ACCEPTED", "REJECTED"]);

const CLOSED_APPLICATION_STATUSES: ApplicationStatus[] = ["ACCEPTED", "REJECTED"];

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = applicationStatusSchema.safeParse(status);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status." };
  }

  const application = await prisma.jobApplication.findUnique({ where: { id: applicationId } });
  if (!application) {
    return { ok: false, error: "Application not found." };
  }

  if (CLOSED_APPLICATION_STATUSES.includes(application.status)) {
    return { ok: false, error: "This application is already closed and cannot be changed." };
  }

  if (application.status === status) {
    return { ok: true };
  }

  let emailFailed = false;

  if (status === "ACCEPTED" || status === "REJECTED" || status === "UNDER_REVIEW") {
    const email =
      status === "ACCEPTED"
        ? applicationAcceptedEmail({
            fullName: application.fullName,
            position: application.position,
          })
        : status === "REJECTED"
          ? applicationRejectedEmail({
              fullName: application.fullName,
              position: application.position,
            })
          : applicationUnderReviewEmail({
              fullName: application.fullName,
              position: application.position,
            });

    try {
      const result = await sendEmail({
        to: application.email,
        subject: email.subject,
        html: email.html,
      });
      if (result.skipped) {
        emailFailed = true;
      }
    } catch (error) {
      console.error("[updateApplicationStatus] email failed", error);
      if (status === "ACCEPTED" || status === "REJECTED") {
        return {
          ok: false,
          error: "Could not send the decision email. Status was not updated — try again.",
        };
      }
      emailFailed = true;
    }
  }

  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status },
  });

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);

  await logAdminAction({
    actorId: admin.id,
    action: "APPLICATION_STATUS_UPDATE",
    entityType: "application",
    entityId: applicationId,
    summary: `Changed application for ${application.fullName} to ${status.replace(/_/g, " ").toLowerCase()}`,
    metadata: { previousStatus: application.status, newStatus: status, position: application.position },
  });
  revalidateAuditLogPath();

  return {
    ok: true,
    notified: status !== "SUBMITTED",
    emailFailed,
  };
}

const jobPostingSchema = z.object({
  title: z.string().trim().min(2, "Enter a job title").max(120),
  type: z.enum(EMPLOYMENT_TYPES, { message: "Select an employment type" }),
  location: z.enum(JOB_LOCATIONS, { message: "Select a location" }),
  compensation: z
    .string()
    .trim()
    .min(2, "Enter compensation (e.g. Up to $30/hour)")
    .max(80),
  summary: z.string().trim().min(10, "Enter a short summary").max(2000),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

const jobPostingCreateSchema = jobPostingSchema
  .omit({ sortOrder: true })
  .extend({
    sortOrder: z.coerce.number().int().min(0).max(999).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
      .optional()
      .or(z.literal("")),
  });

export async function createJobPosting(
  input: z.infer<typeof jobPostingCreateSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = jobPostingCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const { title, type, location, compensation, summary, isActive, sortOrder, slug } = parsed.data;
  const baseSlug = slug?.trim() || slugifyServiceName(title);
  if (!baseSlug) {
    return { ok: false, error: "Could not generate a URL slug from the job title." };
  }

  const uniqueSlug = await resolveUniqueJobSlug(baseSlug);
  const maxSort = await prisma.jobPosting.aggregate({ _max: { sortOrder: true } });
  const nextSort = sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1;

  const job = await prisma.jobPosting.create({
    data: {
      slug: uniqueSlug,
      title,
      type,
      location,
      compensation,
      summary,
      isActive,
      sortOrder: nextSort,
    },
  });

  revalidateJobPaths(job.id);
  await logAdminAction({
    actorId: admin.id,
    action: "JOB_CREATE",
    entityType: "job",
    entityId: job.id,
    summary: `Created job posting "${job.title}"`,
    metadata: { slug: job.slug },
  });
  revalidateAuditLogPath();
  return { ok: true, serviceId: job.id };
}

export async function updateJobPosting(
  jobId: string,
  input: z.infer<typeof jobPostingSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = jobPostingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
  if (!job) {
    return { ok: false, error: "Job not found." };
  }

  const { title, type, location, compensation, summary, isActive, sortOrder } = parsed.data;

  await prisma.jobPosting.update({
    where: { id: jobId },
    data: { title, type, location, compensation, summary, isActive, sortOrder },
  });

  revalidateJobPaths(jobId);
  await logAdminAction({
    actorId: admin.id,
    action: "JOB_UPDATE",
    entityType: "job",
    entityId: jobId,
    summary: `Updated job posting "${title}"`,
  });
  revalidateAuditLogPath();
  return { ok: true };
}

export async function deleteJobPosting(jobId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
  if (!job) {
    return { ok: false, error: "Job not found." };
  }

  // Applications are linked by position title (no FK cascade). Keep rows; remove resume files only.
  const applications = await prisma.jobApplication.findMany({
    where: { position: job.title },
    select: { id: true, resumeS3Key: true },
  });

  let resumesDeleted = 0;
  for (const app of applications) {
    const key = app.resumeS3Key?.trim();
    if (!key) continue;
    if (isS3Configured()) {
      try {
        await deleteObject(key);
        resumesDeleted += 1;
      } catch (error) {
        console.error("[deleteJobPosting] resume S3 delete failed", app.id, error);
      }
    }
  }

  if (applications.length > 0) {
    await prisma.jobApplication.updateMany({
      where: { position: job.title },
      data: { resumeS3Key: null, resumeUrl: null },
    });
  }

  // Soft-deactivate the posting so application history (and position name) survive.
  await prisma.jobPosting.update({
    where: { id: jobId },
    data: { isActive: false },
  });

  revalidateJobPaths(jobId);
  revalidatePath("/admin/applications");
  await logAdminAction({
    actorId: admin.id,
    action: "JOB_DELETE",
    entityType: "job",
    entityId: jobId,
    summary: `Deactivated job posting "${job.title}" (cleared ${resumesDeleted} resume file(s); kept ${applications.length} application record(s))`,
    metadata: {
      deactivated: true,
      applicationsKept: applications.length,
      resumesDeleted,
    },
  });
  revalidateAuditLogPath();
  return { ok: true, deactivated: true };
}

const promoteAdminSchema = z.object({
  phone: z.string().min(10, "Enter a valid phone number"),
});

const userIdSchema = z.object({
  userId: z.string().min(1, "User is required."),
});

export async function promoteUserToAdminById(userId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = userIdSchema.safeParse({ userId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid user." };
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return {
      ok: false,
      error: "No account found. They must register and sign in first.",
    };
  }

  if (user.role === "ADMIN") {
    return { ok: false, error: "This user is already an admin." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  const emailed = await sendRoleChangeEmail(user, true);

  revalidatePath("/admin/team");
  revalidatePath("/admin/customers");

  await logAdminAction({
    actorId: admin.id,
    action: "USER_PROMOTE_ADMIN",
    entityType: "user",
    entityId: user.id,
    summary: `Granted admin access to ${user.phone}`,
    metadata: { phone: user.phone, email: user.email },
  });
  revalidateAuditLogPath();

  return { ok: true, emailed };
}

export async function demoteUserFromAdmin(userId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = userIdSchema.safeParse({ userId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid user." };
  }

  if (admin.id === parsed.data.userId) {
    return { ok: false, error: "You cannot remove your own admin access." };
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return { ok: false, error: "User not found." };
  }

  if (user.role !== "ADMIN") {
    return { ok: false, error: "This user is not an admin." };
  }

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount <= 1) {
    return { ok: false, error: "Cannot remove the last admin account." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "CUSTOMER" },
  });

  const emailed = await sendRoleChangeEmail(user, false);

  revalidatePath("/admin/team");
  revalidatePath("/admin/customers");

  await logAdminAction({
    actorId: admin.id,
    action: "USER_DEMOTE_ADMIN",
    entityType: "user",
    entityId: user.id,
    summary: `Revoked admin access from ${user.phone}`,
    metadata: { phone: user.phone, email: user.email },
  });
  revalidateAuditLogPath();

  return { ok: true, emailed };
}

export async function promoteUserToAdmin(phone: string): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = promoteAdminSchema.safeParse({ phone: phone.trim() });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid phone." };
  }

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user) {
    return {
      ok: false,
      error: "No account found with that phone. They must register and sign in first.",
    };
  }

  return promoteUserToAdminById(user.id);
}

async function revalidateGalleryPaths() {
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  await invalidateGalleryCache();
}

function revalidateReviewPaths() {
  revalidatePath("/admin/reviews");
  revalidatePath("/testimonials");
  revalidatePath("/");
}

const galleryImageRef = z
  .string()
  .trim()
  .refine((val) => isAllowedMediaRef(val), {
    message: "Image must be a local path, S3 key (gallery/…), or URL to your S3 bucket.",
  })
  .optional()
  .or(z.literal(""));

const galleryItemSchema = z.object({
  type: z.enum(["CARD", "BEFORE_AFTER"]),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  imageUrl: galleryImageRef,
  beforeUrl: galleryImageRef,
  afterUrl: galleryImageRef,
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export async function createGalleryItem(
  input: z.infer<typeof galleryItemSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = galleryItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const { type, title, category, imageUrl, beforeUrl, afterUrl, isActive, sortOrder } = parsed.data;
  if (type === "CARD" && !imageUrl) {
    return { ok: false, error: "Image is required for gallery cards." };
  }
  if (type === "BEFORE_AFTER" && (!beforeUrl || !afterUrl)) {
    return { ok: false, error: "Before and after images are required." };
  }

  const maxSort = await prisma.galleryItem.aggregate({ _max: { sortOrder: true } });
  const item = await prisma.galleryItem.create({
    data: {
      type,
      title,
      category,
      imageUrl: imageUrl || null,
      beforeUrl: beforeUrl || null,
      afterUrl: afterUrl || null,
      isActive,
      sortOrder: sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  await revalidateGalleryPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "GALLERY_CREATE",
    entityType: "gallery",
    entityId: item.id,
    summary: `Created gallery item "${title}"`,
    metadata: { type, category },
  });
  revalidateAuditLogPath();
  return { ok: true };
}

export async function updateGalleryItem(
  id: string,
  input: z.infer<typeof galleryItemSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = galleryItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "Gallery item not found." };

  const { type, title, category, imageUrl, beforeUrl, afterUrl, isActive, sortOrder } = parsed.data;
  const nextImageUrl = imageUrl || null;
  const nextBeforeUrl = beforeUrl || null;
  const nextAfterUrl = afterUrl || null;

  await prisma.galleryItem.update({
    where: { id },
    data: {
      type,
      title,
      category,
      imageUrl: nextImageUrl,
      beforeUrl: nextBeforeUrl,
      afterUrl: nextAfterUrl,
      isActive,
      sortOrder: sortOrder ?? item.sortOrder,
    },
  });

  if (item.imageUrl && item.imageUrl !== nextImageUrl) {
    await deleteOwnedObjectBestEffort(item.imageUrl, "updateGalleryItem");
  }
  if (item.beforeUrl && item.beforeUrl !== nextBeforeUrl) {
    await deleteOwnedObjectBestEffort(item.beforeUrl, "updateGalleryItem");
  }
  if (item.afterUrl && item.afterUrl !== nextAfterUrl) {
    await deleteOwnedObjectBestEffort(item.afterUrl, "updateGalleryItem");
  }

  await revalidateGalleryPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "GALLERY_UPDATE",
    entityType: "gallery",
    entityId: id,
    summary: `Updated gallery item "${title}"`,
  });
  revalidateAuditLogPath();
  return { ok: true };
}

export async function deleteGalleryItem(id: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "Gallery item not found." };

  await prisma.galleryItem.delete({ where: { id } });
  await Promise.all([
    deleteOwnedObjectBestEffort(item.imageUrl, "deleteGalleryItem"),
    deleteOwnedObjectBestEffort(item.beforeUrl, "deleteGalleryItem"),
    deleteOwnedObjectBestEffort(item.afterUrl, "deleteGalleryItem"),
  ]);
  await revalidateGalleryPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "GALLERY_DELETE",
    entityType: "gallery",
    entityId: id,
    summary: `Deleted gallery item "${item.title}"`,
  });
  revalidateAuditLogPath();
  return { ok: true };
}

export async function updateReviewStatus(
  reviewId: string,
  data: { status: "APPROVED" | "REJECTED" | "PENDING"; featured: boolean },
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: data.status,
      featured: data.featured && data.status === "APPROVED",
    },
  });

  revalidateReviewPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "REVIEW_UPDATE",
    entityType: "review",
    entityId: reviewId,
    summary: `Set review to ${data.status.toLowerCase()}${data.featured && data.status === "APPROVED" ? " (featured)" : ""}`,
    metadata: { status: data.status, featured: data.featured },
  });
  revalidateAuditLogPath();
  return { ok: true };
}

export async function deleteReview(reviewId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await prisma.review.delete({ where: { id: reviewId } });
  revalidateReviewPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "REVIEW_DELETE",
    entityType: "review",
    entityId: reviewId,
    summary: "Deleted a customer review",
  });
  revalidateAuditLogPath();
  return { ok: true };
}

const promotionSchema = z
  .object({
    title: z.string().trim().min(2, "Enter a title").max(120),
    description: z.string().trim().min(10, "Enter a description").max(2000),
    isActive: z.boolean(),
    discountType: z.enum(["FLAT", "PERCENTAGE"]),
    flatAmountDollars: z.coerce.number().optional(),
    discountPercent: z.coerce.number().optional(),
    serviceIds: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "FLAT") {
      if (!data.flatAmountDollars || data.flatAmountDollars <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a discount amount greater than zero.",
          path: ["flatAmountDollars"],
        });
      }
    } else if (!data.discountPercent || data.discountPercent < 1 || data.discountPercent > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a percentage between 1 and 100.",
        path: ["discountPercent"],
      });
    }
  });

function promotionDiscountValueFromInput(input: z.infer<typeof promotionSchema>) {
  if (input.discountType === "FLAT") {
    return Math.round((input.flatAmountDollars ?? 0) * 100);
  }
  return Math.round(input.discountPercent ?? 0);
}

async function syncPromotionServices(promotionId: string, serviceIds: string[]) {
  await prisma.promotionOnService.deleteMany({ where: { promotionId } });
  if (serviceIds.length === 0) return;
  await prisma.promotionOnService.createMany({
    data: serviceIds.map((serviceId) => ({ promotionId, serviceId })),
  });
}

async function revalidatePromotionPaths() {
  revalidatePath("/admin/promotions");
  revalidatePath("/promotions");
  await invalidatePromotionsCache();
}

export async function createPromotion(
  input: z.infer<typeof promotionSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const promotion = await prisma.promotion.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      isActive: parsed.data.isActive,
      discountType: parsed.data.discountType,
      discountValue: promotionDiscountValueFromInput(parsed.data),
    },
  });

  await syncPromotionServices(promotion.id, parsed.data.serviceIds);

  await revalidatePromotionPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "PROMOTION_CREATE",
    entityType: "promotion",
    entityId: promotion.id,
    summary: `Created promotion "${promotion.title}"`,
  });
  revalidateAuditLogPath();

  if (promotion.isActive) {
    void notifyCustomersPromotion({
      title: promotion.title,
      description: promotion.description,
      created: true,
    }).catch((error) => {
      console.error("[promotions] customer notify failed", error);
    });
  }

  return { ok: true };
}

export async function updatePromotion(
  promotionId: string,
  input: z.infer<typeof promotionSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.promotion.findUnique({ where: { id: promotionId } });
  if (!existing) {
    return { ok: false, error: "Promotion not found." };
  }

  const promotion = await prisma.promotion.update({
    where: { id: promotionId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      isActive: parsed.data.isActive,
      discountType: parsed.data.discountType,
      discountValue: promotionDiscountValueFromInput(parsed.data),
    },
  });

  await syncPromotionServices(promotion.id, parsed.data.serviceIds);

  await revalidatePromotionPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "PROMOTION_UPDATE",
    entityType: "promotion",
    entityId: promotion.id,
    summary: `Updated promotion "${promotion.title}"`,
    metadata: { isActive: promotion.isActive },
  });
  revalidateAuditLogPath();

  const wasActivated = !existing.isActive && promotion.isActive;
  if (wasActivated) {
    void notifyCustomersPromotion({
      title: promotion.title,
      description: promotion.description,
      created: true,
    }).catch((error) => {
      console.error("[promotions] customer notify failed", error);
    });
  }

  return { ok: true };
}

export async function deletePromotion(promotionId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
  if (!promotion) {
    return { ok: false, error: "Promotion not found." };
  }

  await prisma.promotion.delete({ where: { id: promotionId } });

  await revalidatePromotionPaths();
  await logAdminAction({
    actorId: admin.id,
    action: "PROMOTION_DELETE",
    entityType: "promotion",
    entityId: promotionId,
    summary: `Deleted promotion "${promotion.title}"`,
  });
  revalidateAuditLogPath();

  return { ok: true };
}

const scheduleBlockSchema = z
  .object({
    blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    allDay: z.boolean(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    reason: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.allDay) {
      if (!data.startTime || !data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start and end times are required for a partial-day block.",
        });
        return;
      }
      if (data.startTime >= data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time must be after start time.",
        });
      }
    }
  });

function revalidateSchedulePaths() {
  revalidatePath("/admin/schedule");
  revalidatePath("/book");
  revalidatePath("/dashboard/bookings");
}

export async function createScheduleBlock(
  input: z.infer<typeof scheduleBlockSchema>,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = scheduleBlockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const block = await prisma.scheduleBlock.create({
    data: {
      blockDate: parseScheduleDate(parsed.data.blockDate),
      allDay: parsed.data.allDay,
      startTime: parsed.data.allDay ? null : parsed.data.startTime,
      endTime: parsed.data.allDay ? null : parsed.data.endTime,
      reason: parsed.data.reason?.trim() || null,
      createdById: admin.id,
    },
  });

  revalidateSchedulePaths();
  await logAdminAction({
    actorId: admin.id,
    action: "SCHEDULE_BLOCK_CREATE",
    entityType: "schedule_block",
    entityId: block.id,
    summary: parsed.data.allDay
      ? `Blocked ${parsed.data.blockDate} (all day)`
      : `Blocked ${parsed.data.blockDate} ${parsed.data.startTime}-${parsed.data.endTime}`,
  });
  revalidateAuditLogPath();

  return { ok: true };
}

export async function deleteScheduleBlock(blockId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const block = await prisma.scheduleBlock.findUnique({ where: { id: blockId } });
  if (!block) {
    return { ok: false, error: "Schedule block not found." };
  }

  await prisma.scheduleBlock.delete({ where: { id: blockId } });

  revalidateSchedulePaths();
  await logAdminAction({
    actorId: admin.id,
    action: "SCHEDULE_BLOCK_DELETE",
    entityType: "schedule_block",
    entityId: block.id,
    summary: block.allDay
      ? `Removed all-day block on ${block.blockDate.toISOString().slice(0, 10)}`
      : `Removed time block on ${block.blockDate.toISOString().slice(0, 10)}`,
  });
  revalidateAuditLogPath();

  return { ok: true };
}
