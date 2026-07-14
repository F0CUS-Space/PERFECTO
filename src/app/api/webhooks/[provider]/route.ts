import { NextResponse } from "next/server";

import { getWebhookHandler } from "@/features/payments/services/webhooks/registry";
import { processWebhook } from "@/features/payments/services/webhooks/router";

export const runtime = "nodejs";

/**
 * Provider-agnostic webhook endpoint. Resolves the handler for the `provider`
 * path segment and runs the shared verify → dedupe → dispatch pipeline. Add a
 * provider by registering it in the webhook registry — no route changes needed.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const handler = getWebhookHandler(provider);

  if (!handler) {
    return NextResponse.json({ error: `Unknown payment provider: ${provider}` }, { status: 404 });
  }

  return processWebhook(handler, request);
}
