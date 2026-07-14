/**
 * Provider-agnostic payment lifecycle events.
 *
 * Each payment provider (Stripe today, others later) translates its own native
 * webhook/event types into one of these shared domain events, so the rest of the
 * codebase reasons about payments in provider-neutral terms.
 */
export const PAYMENT_EVENT = {
  /** A booking's payment was captured/settled. */
  DEPOSIT_PAID: "DEPOSIT_PAID",
  /** A payment attempt failed (card declined, async failure, etc.). */
  DEPOSIT_FAILED: "DEPOSIT_FAILED",
  /** An open checkout session expired without payment. */
  CHECKOUT_EXPIRED: "CHECKOUT_EXPIRED",
  /** A refund settled against a previously captured payment. */
  REFUND_SETTLED: "REFUND_SETTLED",
  /** Recognized but intentionally not acted upon. */
  IGNORED: "IGNORED",
} as const;

export type PaymentEventType = (typeof PAYMENT_EVENT)[keyof typeof PAYMENT_EVENT];

/** Human-readable labels for logs/observability. */
export const PAYMENT_EVENT_LABEL: Record<PaymentEventType, string> = {
  DEPOSIT_PAID: "Payment captured",
  DEPOSIT_FAILED: "Payment failed",
  CHECKOUT_EXPIRED: "Checkout expired",
  REFUND_SETTLED: "Refund settled",
  IGNORED: "Ignored",
};
