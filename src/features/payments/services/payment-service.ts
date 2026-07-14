export interface CreateDepositCheckoutInput {
  bookingId: string;
  paymentId: string;
  userId: string;
  amountCents: number;
  serviceName: string;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
  /** Stripe idempotency key — prevents duplicate sessions on double-click. */
  idempotencyKey: string;
}

export interface DepositCheckoutSession {
  url: string;
  sessionId: string;
}

export interface RefundPaymentInput {
  /** Provider PaymentIntent id to refund against (Stripe pi_...). */
  paymentIntentId: string;
  /** Amount to refund in cents. Omit to refund the full captured amount. */
  amountCents?: number;
  /** Optional human-readable reason (stored on the provider refund). */
  reason?: string;
  /** Idempotency key — prevents duplicate refunds on retries/double-clicks. */
  idempotencyKey: string;
}

export interface RefundResult {
  refundId: string;
  /** Provider refund status, e.g. "succeeded" | "pending" | "failed". */
  status: string;
  amountCents: number;
}

/** Swappable payment provider interface (Stripe in V1.0). */
export interface PaymentService {
  createDepositCheckoutSession(
    input: CreateDepositCheckoutInput,
  ): Promise<DepositCheckoutSession>;

  refundPayment(input: RefundPaymentInput): Promise<RefundResult>;
}
