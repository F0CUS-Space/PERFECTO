import "server-only";

import Stripe from "stripe";

import { requireEnv } from "@/env";

let stripeClient: Stripe | undefined;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      // Pin to the SDK's bundled API version to stay in sync with the typings.
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      // Fail fast on hung connections and let the SDK retry transient/network errors
      // (idempotency keys make our create/refund calls safe to retry).
      timeout: 20_000,
      maxNetworkRetries: 2,
    });
  }
  return stripeClient;
}
