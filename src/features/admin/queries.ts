import "server-only";

import type { ApplicationStatus, BookingStatus, AdminAuditAction } from "@prisma/client";

import { reconcileBookingPayments } from "@/features/payments/services/reconcile-payments";
import {
  amountPaidByBookingIds,
  cappedAmountPaid,
} from "@/features/payments/booking-amount-paid";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";
import { getViewUrl } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { resolveServiceImageUrl } from "@/features/services-catalog/display";

import type {
  AdminAddOnRow,
  AdminApplicationDetail,
  AdminApplicationRow,
  AdminAuditLogRow,
  AdminBookingDetail,
  AdminBookingRow,
  AdminCustomerDetail,
  AdminCustomerRow,
  AdminDashboardStats,
  AdminJobPostingDetail,
  AdminJobPostingRow,
  AdminPaymentRow,
  AdminServiceDetail,
  AdminServiceRow,
  AdminStatMetric,
} from "./types";
import {
  getPeriodLabels,
  getPeriodRange,
  percentChange,
  type AdminStatsPeriod,
} from "./stats-period";
import {
  adminDisplayName,
  auditEntityHref,
  formatAuditAction,
} from "./audit-log";

function customerDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  phone: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.phone;
}

async function countStatsInRange(start: Date, end: Date) {
  const createdAt = { gte: start, lte: end };

  const [totalBookings, pendingPayment, totalCustomers, openApplications, succeededPayments] =
    await Promise.all([
      prisma.booking.count({ where: { createdAt } }),
      prisma.booking.count({ where: { createdAt, status: "PENDING_PAYMENT" } }),
      prisma.user.count({ where: { role: "CUSTOMER", createdAt } }),
      prisma.jobApplication.count({
        where: { createdAt, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      }),
      prisma.payment.aggregate({
        where: { status: "SUCCEEDED", createdAt },
        _sum: { amount: true },
      }),
    ]);

  return {
    totalBookings,
    pendingPayment,
    totalCustomers,
    openApplications,
    totalRevenue: succeededPayments._sum.amount ?? 0,
  };
}

function buildMetric(current: number, previous: number): AdminStatMetric {
  return {
    value: current,
    previousValue: previous,
    changePercent: percentChange(current, previous),
  };
}

export async function getAdminDashboardStats(
  period: AdminStatsPeriod = "24h",
): Promise<AdminDashboardStats> {
  const labels = getPeriodLabels(period);

  if (!isDatabaseConfigured()) {
    const empty = buildMetric(0, 0);
    return {
      period,
      periodLabel: labels.short,
      comparisonLabel: labels.comparison,
      bookings: empty,
      pendingPayment: empty,
      customers: empty,
      openApplications: empty,
      revenue: empty,
    };
  }

  const { start, end, previousStart, previousEnd } = getPeriodRange(period);
  const [current, previous] = await Promise.all([
    countStatsInRange(start, end),
    countStatsInRange(previousStart, previousEnd),
  ]);

  return {
    period,
    periodLabel: labels.short,
    comparisonLabel: labels.comparison,
    bookings: buildMetric(current.totalBookings, previous.totalBookings),
    pendingPayment: buildMetric(current.pendingPayment, previous.pendingPayment),
    customers: buildMetric(current.totalCustomers, previous.totalCustomers),
    openApplications: buildMetric(current.openApplications, previous.openApplications),
    revenue: buildMetric(current.totalRevenue, previous.totalRevenue),
  };
}

/** @deprecated Use getAdminDashboardStats */
export async function getAdminStats() {
  const stats = await getAdminDashboardStats("365d");
  return {
    totalBookings: stats.bookings.value,
    pendingPayment: stats.pendingPayment.value,
    confirmedUpcoming: 0,
    totalCustomers: stats.customers.value,
    totalRevenue: stats.revenue.value,
    openApplications: stats.openApplications.value,
  };
}

export async function getAdminBookings(filters?: {
  status?: BookingStatus;
  q?: string;
  since?: Date;
}): Promise<AdminBookingRow[]> {
  if (!isDatabaseConfigured()) return [];

  const q = filters?.q?.trim();
  const bookings = await prisma.booking.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.since ? { createdAt: { gte: filters.since } } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { addressLine: { contains: q, mode: "insensitive" } },
              { user: { phone: { contains: q } } },
              { user: { firstName: { contains: q, mode: "insensitive" } } },
              { user: { lastName: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { service: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      service: { select: { name: true } },
      user: { select: { firstName: true, lastName: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const paidMap = await amountPaidByBookingIds(bookings.map((booking) => booking.id));

  return bookings.map((booking) => ({
    id: booking.id,
    serviceName: booking.service.name,
    customerName: customerDisplayName(booking.user),
    customerPhone: booking.user.phone,
    scheduledDate: booking.scheduledDate.toISOString(),
    arrivalWindow: booking.arrivalWindow,
    status: booking.status,
    totalAmount: booking.totalAmount,
    amountPaid: cappedAmountPaid(paidMap, booking.id, booking.totalAmount),
    city: booking.city,
    createdAt: booking.createdAt.toISOString(),
  }));
}

export async function getAdminBookingById(id: string): Promise<AdminBookingDetail | null> {
  if (!isDatabaseConfigured()) return null;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: { select: { name: true } },
      user: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      invoice: { select: { number: true } },
      agreement: true,
      photos: { orderBy: { uploadedAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!booking) return null;

  let amountPaid = 0;
  let fullyPaid = false;
  try {
    const reconcile = await reconcileBookingPayments(booking.id);
    amountPaid = reconcile.amountPaid;
    fullyPaid = reconcile.fullyPaid;
  } catch {
    const paidMap = await amountPaidByBookingIds([booking.id]);
    amountPaid = cappedAmountPaid(paidMap, booking.id, booking.totalAmount);
    fullyPaid = amountPaid >= booking.totalAmount;
  }

  const photos = await Promise.all(
    booking.photos.map(async (photo) => {
      let viewUrl = photo.url;
      if (isS3Configured() && photo.s3Key) {
        try {
          viewUrl = await getViewUrl(photo.s3Key, 3600);
        } catch {
          viewUrl = photo.url;
        }
      }
      return { id: photo.id, viewUrl };
    }),
  );

  return {
    id: booking.id,
    serviceName: booking.service.name,
    customerId: booking.user.id,
    customerName: customerDisplayName(booking.user),
    customerPhone: booking.user.phone,
    customerEmail: booking.user.email,
    scheduledDate: booking.scheduledDate.toISOString(),
    arrivalWindow: booking.arrivalWindow,
    status: booking.status,
    totalAmount: booking.totalAmount,
    depositAmount: booking.depositAmount,
    balanceAmount: booking.balanceAmount,
    amountPaid,
    fullyPaid,
    addressLine: booking.addressLine,
    city: booking.city,
    postalCode: booking.postalCode,
    bedrooms: booking.bedrooms,
    bathrooms: booking.bathrooms,
    hasPets: booking.hasPets,
    petNotes: booking.petNotes,
    accessInfo: booking.accessInfo,
    specialInstructions: booking.specialInstructions,
    invoiceNumber: booking.invoice?.number ?? null,
    promotionTitle: booking.promotionTitle,
    promotionDiscountCents: booking.promotionDiscountCents,
    createdAt: booking.createdAt.toISOString(),
    agreement: booking.agreement
      ? {
          signatureName: booking.agreement.signatureName,
          signedAt: booking.agreement.signedAt.toISOString(),
          acceptedTerms: booking.agreement.acceptedTerms,
          acceptedCancellation: booking.agreement.acceptedCancellation,
          acceptedLiability: booking.agreement.acceptedLiability,
          ipAddress: booking.agreement.ipAddress,
        }
      : null,
    photos,
    payments: booking.payments.map((payment) => ({
      id: payment.id,
      type: payment.type,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}

export async function getAdminCustomers(q?: string): Promise<AdminCustomerRow[]> {
  if (!isDatabaseConfigured()) return [];

  const search = q?.trim();
  const users = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(search
        ? {
            OR: [
              { phone: { contains: search } },
              { email: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    bookingCount: user._count.bookings,
    createdAt: user.createdAt.toISOString(),
  }));
}

export async function getAdminCustomerById(id: string): Promise<AdminCustomerDetail | null> {
  if (!isDatabaseConfigured()) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { bookings: true } } },
  });

  if (!user) return null;

  const userBookings = await prisma.booking.findMany({
    where: { userId: id },
    include: {
      service: { select: { name: true } },
      user: { select: { firstName: true, lastName: true, phone: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  const paidMap = await amountPaidByBookingIds(userBookings.map((booking) => booking.id));

  const bookingRows = userBookings.map((booking) => ({
    id: booking.id,
    serviceName: booking.service.name,
    customerName: customerDisplayName(booking.user),
    customerPhone: booking.user.phone,
    scheduledDate: booking.scheduledDate.toISOString(),
    arrivalWindow: booking.arrivalWindow,
    status: booking.status,
    totalAmount: booking.totalAmount,
    amountPaid: cappedAmountPaid(paidMap, booking.id, booking.totalAmount),
    city: booking.city,
    createdAt: booking.createdAt.toISOString(),
  }));

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    bookingCount: user._count.bookings,
    createdAt: user.createdAt.toISOString(),
    bookings: bookingRows,
  };
}

export async function getAdminPayments(): Promise<AdminPaymentRow[]> {
  if (!isDatabaseConfigured()) return [];

  const payments = await prisma.payment.findMany({
    include: {
      booking: {
        select: {
          service: { select: { name: true } },
          user: { select: { firstName: true, lastName: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return payments.map((payment) => ({
    id: payment.id,
    bookingId: payment.bookingId,
    serviceName: payment.booking.service.name,
    customerName: customerDisplayName(payment.booking.user),
    type: payment.type,
    status: payment.status,
    amount: payment.amount,
    createdAt: payment.createdAt.toISOString(),
  }));
}

async function mapServiceRow(service: {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string | null;
  includes: string[];
  idealFor: string[];
  pricingNote: string | null;
  basePrice: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  imageUrl: string | null;
}): Promise<AdminServiceRow> {
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    longDescription: service.longDescription,
    includes: service.includes,
    idealFor: service.idealFor,
    pricingNote: service.pricingNote,
    basePrice: service.basePrice,
    isActive: service.isActive,
    isPopular: service.isPopular,
    sortOrder: service.sortOrder,
    imageUrl: service.imageUrl,
    image: await resolveServiceImageUrl(service.imageUrl, service.slug),
  };
}

export async function getAdminServices(): Promise<AdminServiceRow[]> {
  if (!isDatabaseConfigured()) return [];

  const services = await prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return Promise.all(services.map(mapServiceRow));
}

export async function getAdminServiceById(id: string): Promise<AdminServiceDetail | null> {
  if (!isDatabaseConfigured()) return null;

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      addOns: { select: { addOnId: true } },
      _count: { select: { bookings: true } },
    },
  });

  if (!service) return null;

  return {
    ...await mapServiceRow(service),
    linkedAddOnIds: service.addOns.map((link) => link.addOnId),
    bookingCount: service._count.bookings,
  };
}

export async function getAdminAddOns(): Promise<AdminAddOnRow[]> {
  if (!isDatabaseConfigured()) return [];

  const addOns = await prisma.addOn.findMany({
    include: { _count: { select: { services: true } } },
    orderBy: { name: "asc" },
  });

  return addOns.map((addOn) => ({
    id: addOn.id,
    name: addOn.name,
    price: addOn.price,
    isActive: addOn.isActive,
    serviceCount: addOn._count.services,
  }));
}

export async function getAdminApplications(filters?: {
  status?: ApplicationStatus;
  q?: string;
}): Promise<AdminApplicationRow[]> {
  if (!isDatabaseConfigured()) return [];

  const search = filters?.q?.trim();

  const applications = await prisma.jobApplication.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { position: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return applications.map((app) => ({
    id: app.id,
    fullName: app.fullName,
    email: app.email,
    phone: app.phone,
    position: app.position,
    status: app.status,
    hasResume: Boolean(app.resumeS3Key),
    createdAt: app.createdAt.toISOString(),
  }));
}

export async function getAdminApplicationById(id: string): Promise<AdminApplicationDetail | null> {
  if (!isDatabaseConfigured()) return null;

  const app = await prisma.jobApplication.findUnique({ where: { id } });
  if (!app) return null;

  const priorApplications = await prisma.jobApplication.findMany({
    where: {
      email: app.email,
      id: { not: app.id },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      position: true,
      status: true,
      createdAt: true,
    },
  });

  let resumeViewUrl: string | null = app.resumeUrl;
  if (isS3Configured() && app.resumeS3Key) {
    try {
      resumeViewUrl = await getViewUrl(app.resumeS3Key, 3600);
    } catch {
      resumeViewUrl = app.resumeUrl;
    }
  }

  return {
    id: app.id,
    fullName: app.fullName,
    email: app.email,
    phone: app.phone,
    position: app.position,
    status: app.status,
    hasResume: Boolean(app.resumeS3Key),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    coverNote: app.coverNote,
    resumeUrl: app.resumeUrl,
    resumeViewUrl,
    priorApplications: priorApplications.map((prior) => ({
      id: prior.id,
      position: prior.position,
      status: prior.status,
      createdAt: prior.createdAt.toISOString(),
    })),
  };
}

export async function getAdminJobPostings(): Promise<AdminJobPostingRow[]> {
  if (!isDatabaseConfigured()) return [];

  const jobs = await prisma.jobPosting.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const applicationCounts = await prisma.jobApplication.groupBy({
    by: ["position"],
    _count: { _all: true },
  });
  const countByTitle = new Map(
    applicationCounts.map((row) => [row.position, row._count._all]),
  );

  return jobs.map((job) => ({
    id: job.id,
    slug: job.slug,
    title: job.title,
    type: job.type,
    location: job.location,
    summary: job.summary,
    isActive: job.isActive,
    sortOrder: job.sortOrder,
    applicationCount: countByTitle.get(job.title) ?? 0,
    createdAt: job.createdAt.toISOString(),
  }));
}

export async function getAdminJobPostingById(id: string): Promise<AdminJobPostingDetail | null> {
  if (!isDatabaseConfigured()) return null;

  const job = await prisma.jobPosting.findUnique({ where: { id } });
  if (!job) return null;

  const applicationCount = await prisma.jobApplication.count({
    where: { position: job.title },
  });

  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    type: job.type,
    location: job.location,
    summary: job.summary,
    isActive: job.isActive,
    sortOrder: job.sortOrder,
    applicationCount,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function getAdminTeamMembers(options?: {
  q?: string;
  role?: "ALL" | "ADMIN" | "CUSTOMER";
}): Promise<AdminCustomerRow[]> {
  if (!isDatabaseConfigured()) return [];

  const search = options?.q?.trim();
  const roleFilter = options?.role ?? "ALL";

  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
      ...(search
        ? {
            OR: [
              { phone: { contains: search } },
              { email: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    bookingCount: user._count.bookings,
    createdAt: user.createdAt.toISOString(),
  }));
}

/** @deprecated Use getAdminTeamMembers */
export async function getAdminUsers(): Promise<AdminCustomerRow[]> {
  return getAdminTeamMembers();
}

export async function getAdminAuditLogs(options?: {
  action?: AdminAuditAction;
  actorId?: string;
  q?: string;
  limit?: number;
}): Promise<AdminAuditLogRow[]> {
  if (!isDatabaseConfigured()) return [];

  const search = options?.q?.trim();

  const logs = await prisma.adminAuditLog.findMany({
    where: {
      ...(options?.action ? { action: options.action } : {}),
      ...(options?.actorId ? { actorId: options.actorId } : {}),
      ...(search
        ? {
            OR: [
              { summary: { contains: search, mode: "insensitive" } },
              { entityId: { contains: search, mode: "insensitive" } },
              { actor: { phone: { contains: search } } },
              { actor: { firstName: { contains: search, mode: "insensitive" } } },
              { actor: { lastName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      actor: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 200,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    actionLabel: formatAuditAction(log.action),
    entityType: log.entityType,
    entityId: log.entityId,
    entityHref: auditEntityHref(log.entityType, log.entityId),
    summary: log.summary,
    actorId: log.actor.id,
    actorName: adminDisplayName(log.actor),
    actorPhone: log.actor.phone,
    createdAt: log.createdAt.toISOString(),
  }));
}

export async function getAdminAuditActors(): Promise<{ id: string; name: string }[]> {
  if (!isDatabaseConfigured()) return [];

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, firstName: true, lastName: true, phone: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return admins.map((admin) => ({
    id: admin.id,
    name: adminDisplayName(admin),
  }));
}

export async function getAdminPromotions() {
  if (!isDatabaseConfigured()) return [];

  const promotions = await prisma.promotion.findMany({
    include: {
      services: {
        include: { service: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return promotions.map((promotion) => ({
    id: promotion.id,
    title: promotion.title,
    description: promotion.description,
    isActive: promotion.isActive,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    serviceIds: promotion.services.map((link) => link.serviceId),
    serviceNames: promotion.services.map((link) => link.service.name),
    createdAt: promotion.createdAt.toISOString(),
  }));
}

export async function getAdminScheduleBlocks() {
  if (!isDatabaseConfigured()) return [];

  const rows = await prisma.scheduleBlock.findMany({
    where: {
      blockDate: {
        gte: (() => {
          const today = new Date();
          return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
        })(),
      },
    },
    include: {
      createdBy: { select: { firstName: true, lastName: true, phone: true } },
    },
    orderBy: [{ blockDate: "asc" }, { allDay: "desc" }, { startTime: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    blockDate: row.blockDate.toISOString().slice(0, 10),
    allDay: row.allDay,
    startTime: row.startTime,
    endTime: row.endTime,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    createdByLabel: adminDisplayName(row.createdBy),
  }));
}
