import "server-only";

import { env } from "@/env";

/**
 * Fails fast at server startup if payments aren't fully configured in production.
 *
 * Env vars stay optional so `next build` / local dev never crash before keys are
 * provisioned — but a running production server MUST have Stripe wired up, or
 * bookings could be created that can never be paid or confirmed.
 */
export function assertPaymentsConfiguredForProduction(): void {
  if (env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!env.STRIPE_SECRET_KEY?.trim()) missing.push("STRIPE_SECRET_KEY");
  if (!env.STRIPE_WEBHOOK_SECRET?.trim()) missing.push("STRIPE_WEBHOOK_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Refusing to start in production without payments configured. Missing: ${missing.join(", ")}. ` +
        `Set these environment variables (see .env.example).`,
    );
  }
}
