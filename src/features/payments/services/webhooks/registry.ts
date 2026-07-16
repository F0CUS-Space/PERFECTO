import "server-only";

import type { ProviderWebhookHandler } from "./provider-webhook";
import { StripeWebhookHandler } from "./stripe-webhook-handler";

// Provider webhook registry — add a new provider here and the generic
// /api/webhooks/[provider] route picks it up with no further wiring.
const handlers: Record<string, ProviderWebhookHandler> = {
  stripe: new StripeWebhookHandler(),
};

/** Returns the webhook handler for a provider slug, or null if unknown. */
export function getWebhookHandler(provider: string): ProviderWebhookHandler | null {
  return handlers[provider] ?? null;
}
