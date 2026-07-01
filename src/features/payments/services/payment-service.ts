export interface CreateDepositCheckoutInput {
  bookingId: string;
  paymentId: string;
  userId: string;
  amountCents: number;
  serviceName: string;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface DepositCheckoutSession {
  url: string;
  sessionId: string;
}

/** Swappable payment provider interface (Stripe in V1.0). */
export interface PaymentService {
  createDepositCheckoutSession(
    input: CreateDepositCheckoutInput,
  ): Promise<DepositCheckoutSession>;
}
