import type { BookingOfferStatus } from "@prisma/client";

export interface OfferBreakdownLine {
  addOnId?: string | null;
  name: string;
  priceCents: number;
}

export interface OfferBreakdown {
  servicePriceCents: number;
  lines: OfferBreakdownLine[];
}

export interface EstimateCatalogAddOn {
  id: string;
  name: string;
  price: number;
}

export interface EstimateCatalogService {
  id: string;
  name: string;
  basePrice: number;
  addOns: EstimateCatalogAddOn[];
}

export interface EstimateCustomerHit {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
}

export interface EstimateListRow {
  id: string;
  status: BookingOfferStatus;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  totalAmount: number;
  sentAt: string | null;
  expiresAt: string;
  createdAt: string;
  bookingId: string | null;
}

export interface EstimateDetail {
  id: string;
  token: string;
  status: BookingOfferStatus;
  userId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceId: string;
  serviceName: string;
  totalAmount: number;
  breakdown: OfferBreakdown;
  staffNotes: string | null;
  messageToCustomer: string | null;
  sentAt: string | null;
  expiresAt: string;
  bookingId: string | null;
  createdAt: string;
  createdByName: string;
  payLinkPath: string;
}

export interface PublicOfferSnapshot {
  token: string;
  status: BookingOfferStatus;
  customerName: string;
  serviceName: string;
  totalAmount: number;
  breakdown: OfferBreakdown;
  messageToCustomer: string | null;
  expiresAt: string;
  userId: string | null;
  isExpired: boolean;
}
