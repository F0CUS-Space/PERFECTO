import type { PaymentProvider } from "./payment-service";

/**
 * A settled (captured) payment as reported by a provider, normalized so the
 * reconcile logic is provider-agnostic.
 */
export interface SettledCapture {
  /** Stable provider id for this capture (Stripe checkout session id, cs_...). */
  providerPaymentId: string;
  /** Provider id used for refunds (Stripe PaymentIntent, pi_...). Null if unknown. */
  providerPaymentIntentId: string | null;
  /** Captured amount in cents. */
  amountCents: number;
  /** Local pending payment row id this capture was started from, if present in metadata. */
  metadataPaymentId?: string | null;
}

/**
 * Strategy for fetching a booking's settled captures from a payment provider.
 * Lets {@link reconcileBookingPayments} stay provider-neutral; add a provider by
 * implementing this and registering it in the reconciler factory.
 */
export interface PaymentReconciler {
  readonly provider: PaymentProvider;
  /**
   * Returns settled captures for a booking. MUST return an empty array (not throw)
   * when the provider is unconfigured, so reconcile degrades gracefully.
   */
  findSettledCaptures(bookingId: string): Promise<SettledCapture[]>;
}
