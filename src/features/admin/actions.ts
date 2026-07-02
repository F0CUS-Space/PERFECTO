"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ApplicationStatus, BookingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  applicationAcceptedEmail,
  applicationRejectedEmail,
} from "@/features/recruitment/emails";
import { requireAdmin } from "@/server/rbac";
import { slugifyServiceName } from "@/features/admin/service-slug";

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
  imageUrl: z
    .string()
    .trim()
    .url("Enter a valid image URL")
    .optional()
    .or(z.literal("")),
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

function revalidateCatalogPaths(serviceId?: string) {
  revalidatePath("/admin/services");
  if (serviceId) revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/add-ons");
  revalidatePath("/services");
  revalidatePath("/book");
}

async function resolveUniqueSlug(preferred: string): Promise<string> {
  const slug = preferred;
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.service.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix += 1;
  }
}

export type AdminActionResult =
  | { ok: true; serviceId?: string; deactivated?: boolean }
  | { ok: false; error: string };

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

  const { name, description, basePriceDollars, isActive, isPopular, sortOrder, imageUrl } =
    parsed.data;

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      name,
      description,
      basePrice: Math.round(basePriceDollars * 100),
      isActive,
      isPopular,
      sortOrder,
      imageUrl: imageUrl?.trim() ? imageUrl.trim() : null,
    },
  });

  revalidateCatalogPaths(serviceId);

  return { ok: true };
}

export async function createService(
  input: z.infer<typeof serviceCreateSchema>,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = serviceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input." };
  }

  const { name, description, basePriceDollars, isActive, isPopular, sortOrder, imageUrl, slug } =
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
      basePrice: Math.round(basePriceDollars * 100),
      isActive,
      isPopular,
      sortOrder: nextSort,
      imageUrl: imageUrl?.trim() ? imageUrl.trim() : null,
    },
  });

  revalidateCatalogPaths(service.id);

  return { ok: true, serviceId: service.id };
}

export async function deleteService(serviceId: string): Promise<AdminActionResult> {
  await requireAdmin();

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { _count: { select: { bookings: true, quotes: true } } },
  });

  if (!service) {
    return { ok: false, error: "Service not found." };
  }

  const hasHistory = service._count.bookings > 0 || service._count.quotes > 0;

  if (hasHistory) {
    await prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false, isPopular: false },
    });
    revalidateCatalogPaths(serviceId);
    return { ok: true, deactivated: true };
  }

  await prisma.service.delete({ where: { id: serviceId } });
  revalidateCatalogPaths();
  return { ok: true };
}

export async function setServiceAddOns(
  serviceId: string,
  addOnIds: string[],
): Promise<AdminActionResult> {
  await requireAdmin();

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

  revalidateCatalogPaths(serviceId);
  return { ok: true };
}

export async function createAddOn(
  input: z.infer<typeof addOnSchema>,
): Promise<AdminActionResult> {
  await requireAdmin();

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

  revalidateCatalogPaths();
  return { ok: true };
}

export async function updateAddOn(
  addOnId: string,
  input: z.infer<typeof addOnSchema>,
): Promise<AdminActionResult> {
  await requireAdmin();

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

  revalidateCatalogPaths();
  return { ok: true };
}

export async function deleteAddOn(addOnId: string): Promise<AdminActionResult> {
  await requireAdmin();

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
    revalidateCatalogPaths();
    return { ok: true, deactivated: true };
  }

  await prisma.addOn.delete({ where: { id: addOnId } });
  revalidateCatalogPaths();
  return { ok: true };
}

const applicationStatusSchema = z.enum(["UNDER_REVIEW", "ACCEPTED", "REJECTED"]);

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = applicationStatusSchema.safeParse(status);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status." };
  }

  const application = await prisma.jobApplication.findUnique({ where: { id: applicationId } });
  if (!application) {
    return { ok: false, error: "Application not found." };
  }

  if (application.status === status) {
    return { ok: true };
  }

  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status },
  });

  if (status === "ACCEPTED") {
    const email = applicationAcceptedEmail({
      fullName: application.fullName,
      position: application.position,
    });
    await sendEmail({ to: application.email, subject: email.subject, html: email.html });
  }

  if (status === "REJECTED") {
    const email = applicationRejectedEmail({
      fullName: application.fullName,
      position: application.position,
    });
    await sendEmail({ to: application.email, subject: email.subject, html: email.html });
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);

  return { ok: true };
}

const promoteAdminSchema = z.object({
  phone: z.string().min(10, "Enter a valid phone number"),
});

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
      error: "No account found with that phone. They must register first.",
    };
  }

  if (user.role === "ADMIN") {
    return { ok: false, error: "This user is already an admin." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  revalidatePath("/admin/team");
  revalidatePath("/admin/customers");

  return { ok: true };
}
