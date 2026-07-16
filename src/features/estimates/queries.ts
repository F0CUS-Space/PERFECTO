import "server-only";

import type { BookingOfferStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";
import { adminDisplayName } from "@/features/admin/audit-log";

import type {
  EstimateCatalogService,
  EstimateCustomerHit,
  EstimateDetail,
  EstimateListRow,
  OfferBreakdown,
  PublicOfferSnapshot,
} from "./types";

function parseBreakdown(raw: Prisma.JsonValue): OfferBreakdown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { servicePriceCents: 0, lines: [] };
  }
  const obj = raw as Record<string, unknown>;
  const servicePriceCents =
    typeof obj.servicePriceCents === "number" ? obj.servicePriceCents : 0;
  const linesRaw = Array.isArray(obj.lines) ? obj.lines : [];
  const lines = linesRaw
    .map((line) => {
      if (!line || typeof line !== "object" || Array.isArray(line)) return null;
      const item = line as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name : null;
      const priceCents = typeof item.priceCents === "number" ? item.priceCents : null;
      if (!name || priceCents === null) return null;
      return {
        addOnId: typeof item.addOnId === "string" ? item.addOnId : null,
        name,
        priceCents,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);

  return { servicePriceCents, lines };
}

function isOfferExpired(status: BookingOfferStatus, expiresAt: Date): boolean {
  if (status === "EXPIRED" || status === "CANCELLED" || status === "CONVERTED") {
    return status === "EXPIRED";
  }
  return expiresAt.getTime() < Date.now();
}

export async function getEstimateCatalog(): Promise<EstimateCatalogService[]> {
  if (!isDatabaseConfigured()) return [];

  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      addOns: {
        where: { addOn: { isActive: true } },
        include: { addOn: true },
        orderBy: { addOn: { name: "asc" } },
      },
    },
  });

  return services.map((service) => ({
    id: service.id,
    name: service.name,
    basePrice: service.basePrice,
    addOns: service.addOns.map(({ addOn }) => ({
      id: addOn.id,
      name: addOn.name,
      price: addOn.price,
    })),
  }));
}

export async function searchEstimateCustomers(q: string): Promise<EstimateCustomerHit[]> {
  if (!isDatabaseConfigured()) return [];

  const search = q.trim();
  if (search.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      OR: [
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return users;
}

export async function getAdminEstimates(filters?: {
  status?: BookingOfferStatus;
  q?: string;
}): Promise<EstimateListRow[]> {
  if (!isDatabaseConfigured()) return [];

  const search = filters?.q?.trim();

  const offers = await prisma.bookingOffer.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { customerName: { contains: search, mode: "insensitive" } },
              { customerEmail: { contains: search, mode: "insensitive" } },
              { customerPhone: { contains: search } },
              { serviceName: { contains: search, mode: "insensitive" } },
              { id: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return offers.map((offer) => ({
    id: offer.id,
    status: offer.status,
    customerName: offer.customerName,
    customerEmail: offer.customerEmail,
    customerPhone: offer.customerPhone,
    serviceName: offer.serviceName,
    totalAmount: offer.totalAmount,
    sentAt: offer.sentAt?.toISOString() ?? null,
    expiresAt: offer.expiresAt.toISOString(),
    createdAt: offer.createdAt.toISOString(),
    bookingId: offer.bookingId,
  }));
}

export async function getAdminEstimateById(id: string): Promise<EstimateDetail | null> {
  if (!isDatabaseConfigured()) return null;

  const offer = await prisma.bookingOffer.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true, phone: true },
      },
    },
  });

  if (!offer) return null;

  return {
    id: offer.id,
    token: offer.token,
    status: offer.status,
    userId: offer.userId,
    customerName: offer.customerName,
    customerEmail: offer.customerEmail,
    customerPhone: offer.customerPhone,
    serviceId: offer.serviceId,
    serviceName: offer.serviceName,
    totalAmount: offer.totalAmount,
    breakdown: parseBreakdown(offer.breakdown),
    staffNotes: offer.staffNotes,
    messageToCustomer: offer.messageToCustomer,
    sentAt: offer.sentAt?.toISOString() ?? null,
    expiresAt: offer.expiresAt.toISOString(),
    bookingId: offer.bookingId,
    createdAt: offer.createdAt.toISOString(),
    createdByName: adminDisplayName(offer.createdBy),
    payLinkPath: `/book/offer/${offer.token}`,
  };
}

export async function getPublicOfferByToken(token: string): Promise<PublicOfferSnapshot | null> {
  if (!isDatabaseConfigured()) return null;

  const offer = await prisma.bookingOffer.findUnique({
    where: { token },
  });

  if (!offer) return null;

  const expired = isOfferExpired(offer.status, offer.expiresAt);

  return {
    token: offer.token,
    status: offer.status,
    customerName: offer.customerName,
    serviceName: offer.serviceName,
    totalAmount: offer.totalAmount,
    breakdown: parseBreakdown(offer.breakdown),
    messageToCustomer: offer.messageToCustomer,
    expiresAt: offer.expiresAt.toISOString(),
    userId: offer.userId,
    isExpired: expired,
  };
}

export { parseBreakdown, isOfferExpired };
