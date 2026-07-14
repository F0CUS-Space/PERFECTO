import { getWebhookHandler } from "@/features/payments/services/webhooks/registry";
import { processWebhook } from "@/features/payments/services/webhooks/router";

export const runtime = "nodejs";

/**
 * Stripe webhook — source of truth for deposit confirmation (not the client
 * redirect). Kept at this stable path for the configured Stripe endpoint; the
 * generic /api/webhooks/[provider] route shares the same processing pipeline.
 */
export async function POST(request: Request) {
  const handler = getWebhookHandler("stripe");
  if (!handler) {
    return new Response(JSON.stringify({ error: "Unknown provider." }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  return processWebhook(handler, request);
}
