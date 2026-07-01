import "server-only";

import { env } from "@/env";

/** True when Stripe Checkout can be created (secret key only). */
export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY?.trim());
}

/** True when the webhook endpoint can verify Stripe signatures. */
export function isStripeWebhookConfigured(): boolean {
  return Boolean(env.STRIPE_WEBHOOK_SECRET?.trim());
}

/** Publishable key for client-side Stripe (optional for Checkout redirect flow). */
export function isStripePublishableConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}
