import type { ApplicationStatus, BookingStatus, PaymentStatus, PaymentType, Role } from "@prisma/client";

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
  createdAt: string;
}

export interface AdminApplicationDetail extends AdminApplicationRow {
  coverNote: string | null;
  resumeUrl: string | null;
  resumeViewUrl: string | null;
  updatedAt: string;
}
