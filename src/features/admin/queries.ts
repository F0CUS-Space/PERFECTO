import "server-only";

import type { ApplicationStatus, BookingStatus } from "@prisma/client";

import { reconcileBookingPayments } from "@/features/payments/services/reconcile-payments";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";
import { getViewUrl } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getServiceImage } from "@/lib/service-image";

import type {
  AdminAddOnRow,
  AdminApplicationDetail,
  AdminApplicationRow,
  AdminBookingDetail,
  AdminBookingRow,
  AdminCustomerDetail,
  AdminCustomerRow,
  AdminJobPostingDetail,
  AdminJobPostingRow,
  AdminPaymentRow,
  AdminServiceDetail,
  AdminServiceRow,
} from "./types";

function customerDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  phone: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.phone;
}

async function amountPaidFromDb(bookingId: string, totalAmount: number): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: { bookingId, status: "SUCCEEDED" },
    select: { amount: true },
  });
  return Math.min(
    payments.reduce((sum, payment) => sum + payment.amount, 0),
    totalAmount,
  );
}

export async function getAdminStats() {
  if (!isDatabaseConfigured()) {
    return {
      totalBookings: 0,
      pendingPayment: 0,
      confirmedUpcoming: 0,
      totalCustomers: 0,
      totalRevenue: 0,
      openApplications: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalBookings, pendingPayment, confirmedUpcoming, totalCustomers, succeededPayments, openApplications] =
    await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING_PAYMENT" } }),
      prisma.booking.count({
        where: { status: { in: ["CONFIRMED", "IN_PROGRESS"] }, scheduledDate: { gte: today } },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.payment.aggregate({
        where: { status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      prisma.jobApplication.count({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      }),
    ]);

  return {
    totalBookings,
    pendingPayment,
    confirmedUpcoming,
    totalCustomers,
    totalRevenue: succeededPayments._sum.amount ?? 0,
    openApplications,
  };
}

export async function getAdminBookings(filters?: {
  status?: BookingStatus;
  q?: string;
}): Promise<AdminBookingRow[]> {
  if (!isDatabaseConfigured()) return [];

  const q = filters?.q?.trim();
  const bookings = await prisma.booking.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
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

  return Promise.all(
    bookings.map(async (booking) => ({
      id: booking.id,
      serviceName: booking.service.name,
      customerName: customerDisplayName(booking.user),
      customerPhone: booking.user.phone,
      scheduledDate: booking.scheduledDate.toISOString(),
      arrivalWindow: booking.arrivalWindow,
      status: booking.status,
      totalAmount: booking.totalAmount,
      amountPaid: await amountPaidFromDb(booking.id, booking.totalAmount),
      city: booking.city,
      createdAt: booking.createdAt.toISOString(),
    })),
  );
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
    amountPaid = await amountPaidFromDb(booking.id, booking.totalAmount);
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

  const bookingRows = await Promise.all(
    userBookings.map(async (booking) => ({
      id: booking.id,
      serviceName: booking.service.name,
      customerName: customerDisplayName(booking.user),
      customerPhone: booking.user.phone,
      scheduledDate: booking.scheduledDate.toISOString(),
      arrivalWindow: booking.arrivalWindow,
      status: booking.status,
      totalAmount: booking.totalAmount,
      amountPaid: await amountPaidFromDb(booking.id, booking.totalAmount),
      city: booking.city,
      createdAt: booking.createdAt.toISOString(),
    })),
  );

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

function mapServiceRow(service: {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  imageUrl: string | null;
}): AdminServiceRow {
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    basePrice: service.basePrice,
    isActive: service.isActive,
    isPopular: service.isPopular,
    sortOrder: service.sortOrder,
    imageUrl: service.imageUrl,
    image: getServiceImage(service.slug, service.imageUrl),
  };
}

export async function getAdminServices(): Promise<AdminServiceRow[]> {
  if (!isDatabaseConfigured()) return [];

  const services = await prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return services.map(mapServiceRow);
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
    ...mapServiceRow(service),
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

export async function getAdminUsers(): Promise<AdminCustomerRow[]> {
  if (!isDatabaseConfigured()) return [];

  const users = await prisma.user.findMany({
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
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
