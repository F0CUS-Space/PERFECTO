import type { PaymentProvider } from "../payment-service";

/** Thrown when a webhook payload fails signature verification (→ HTTP 400). */
export class WebhookVerificationError extends Error {
  constructor(message = "Invalid webhook signature.") {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

/** Thrown when a provider is present but not configured for webhooks (→ HTTP 503). */
export class WebhookNotConfiguredError extends Error {
  constructor(message = "Webhook provider is not configured.") {
    super(message);
    this.name = "WebhookNotConfiguredError";
  }
}

/** A verified, parsed webhook ready to be processed exactly once. */
export interface VerifiedWebhook {
  /** Provider-unique event id — used for idempotency. */
  id: string;
  /** Native provider event type — stored for audit/observability. */
  type: string;
  /** Executes the side effects for this event. Must be idempotent. */
  handle(): Promise<void>;
}

/**
 * Provider-agnostic webhook contract. Add a provider by implementing this and
 * registering it in the webhook registry — no route changes required.
 */
export interface ProviderWebhookHandler {
  readonly provider: PaymentProvider;
  /**
   * Verifies the raw request body against the provider signature and parses it.
   * @throws WebhookVerificationError on an invalid/missing signature.
   * @throws WebhookNotConfiguredError when the provider secret is not set.
   */
  verify(rawBody: string, headers: Headers): Promise<VerifiedWebhook>;
}
