import type { BookingStatus, PaymentStatus, PaymentType } from "@prisma/client";

export type CustomerBookingSummary = {
  id: string;
  serviceName: string;
  scheduledDate: string;
  arrivalWindow: string;
  status: BookingStatus;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  amountPaid: number;
  addressLine: string;
  city: string;
  postalCode: string;
  invoiceNumber: string | null;
  isUpcoming: boolean;
};

export type CustomerBookingDetail = CustomerBookingSummary & {
  bedrooms: number;
  bathrooms: number;
  hasPets: boolean;
  accessInfo: string | null;
  specialInstructions: string | null;
  signatureName: string | null;
  signedAt: string | null;
  fullyPaid: boolean;
  depositSatisfied: boolean;
  hasReview: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  canReview: boolean;
  rescheduleCount: number;
  promotionTitle: string | null;
  promotionDiscountCents: number;
};

export type CustomerPaymentRow = {
  id: string;
  bookingId: string;
  serviceName: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  createdAt: string;
  invoiceNumber: string | null;
};
