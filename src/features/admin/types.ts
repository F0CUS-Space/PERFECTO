import type { ApplicationStatus, BookingStatus, PaymentStatus, PaymentType, Role, AdminAuditAction } from "@prisma/client";

import type { AdminStatsPeriod } from "./stats-period";

export interface AdminBookingRow {
  id: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  scheduledDate: string;
  arrivalWindow: string;
  status: BookingStatus;
  totalAmount: number;
  amountPaid: number;
  city: string;
  createdAt: string;
}

export interface AdminBookingDetail extends AdminBookingRow {
  customerId: string;
  customerEmail: string | null;
  addressLine: string;
  postalCode: string;
  bedrooms: number;
  bathrooms: number;
  hasPets: boolean;
  petNotes: string | null;
  accessInfo: string | null;
  specialInstructions: string | null;
  depositAmount: number;
  balanceAmount: number;
  fullyPaid: boolean;
  invoiceNumber: string | null;
  promotionTitle: string | null;
  promotionDiscountCents: number;
  agreement: {
    signatureName: string;
    signedAt: string;
    acceptedTerms: boolean;
    acceptedCancellation: boolean;
    acceptedLiability: boolean;
    ipAddress: string | null;
  } | null;
  photos: { id: string; viewUrl: string }[];
  payments: {
    id: string;
    type: PaymentType;
    status: PaymentStatus;
    amount: number;
    createdAt: string;
  }[];
}

export interface AdminCustomerRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  role: Role;
  bookingCount: number;
  createdAt: string;
}

export interface AdminCustomerDetail extends AdminCustomerRow {
  bookings: AdminBookingRow[];
}

export interface AdminPaymentRow {
  id: string;
  bookingId: string;
  serviceName: string;
  customerName: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  createdAt: string;
}

export interface AdminServiceRow {
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
  image: string;
  imageUrl: string | null;
}

export interface AdminServiceDetail extends AdminServiceRow {
  linkedAddOnIds: string[];
  bookingCount: number;
}

export interface AdminAddOnRow {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  serviceCount: number;
}

export interface AdminApplicationRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  status: ApplicationStatus;
  hasResume: boolean;
  createdAt: string;
}

export interface AdminApplicationDetail extends AdminApplicationRow {
  coverNote: string | null;
  resumeUrl: string | null;
  resumeViewUrl: string | null;
  updatedAt: string;
  priorApplications: { id: string; position: string; status: ApplicationStatus; createdAt: string }[];
}

export interface AdminJobPostingRow {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  compensation: string;
  summary: string;
  isActive: boolean;
  sortOrder: number;
  applicationCount: number;
  createdAt: string;
}

export interface AdminJobPostingDetail extends AdminJobPostingRow {
  updatedAt: string;
}

export interface AdminStatMetric {
  value: number;
  previousValue: number;
  changePercent: number | null;
}

export interface AdminDashboardStats {
  period: AdminStatsPeriod;
  periodLabel: string;
  comparisonLabel: string;
  bookings: AdminStatMetric;
  pendingPayment: AdminStatMetric;
  customers: AdminStatMetric;
  openApplications: AdminStatMetric;
  revenue: AdminStatMetric;
}

export interface AdminAuditLogRow {
  id: string;
  action: AdminAuditAction;
  actionLabel: string;
  entityType: string;
  entityId: string | null;
  entityHref: string | null;
  summary: string;
  actorId: string;
  actorName: string;
  actorPhone: string;
  createdAt: string;
}
