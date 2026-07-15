import "server-only";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
  WebhookNotConfiguredError,
  WebhookVerificationError,
  type ProviderWebhookHandler,
} from "./provider-webhook";

/**
 * Provider-agnostic webhook processing pipeline: verify signature → dedupe →
 * dispatch → record outcome. Shared by the legacy /api/webhooks/stripe route and
 * the generic /api/webhooks/[provider] route so every provider gets identical
 * idempotency and error semantics.
 */
export async function processWebhook(
  handler: ProviderWebhookHandler,
  request: Request,
): Promise<NextResponse> {
  const rawBody = await request.text();

  let verified;
  try {
    verified = await handler.verify(rawBody, request.headers);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof WebhookNotConfiguredError) {
      console.error(`[webhooks/${handler.provider}] not configured`, error.message);
      return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
    }
    throw error;
  }

  // Idempotency: a redelivered event is processed at most once.
  const seen = await prisma.processedWebhookEvent
    .findUnique({ where: { id: verified.id } })
    .catch(() => null);
  if (seen?.status === "PROCESSED") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await verified.handle();

    await prisma.processedWebhookEvent.upsert({
      where: { id: verified.id },
      create: { id: verified.id, type: verified.type, status: "PROCESSED" },
      update: { status: "PROCESSED", error: null, attempts: { increment: 1 } },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[webhooks/${handler.provider}] handler error`,
      verified.type,
      verified.id,
      message,
    );

    // Record the failure for ops visibility; returning 500 lets the provider retry.
    await prisma.processedWebhookEvent
      .upsert({
        where: { id: verified.id },
        create: { id: verified.id, type: verified.type, status: "FAILED", error: message },
        update: { status: "FAILED", error: message, attempts: { increment: 1 } },
      })
      .catch((recordError) => {
        console.error(`[webhooks/${handler.provider}] failed to record event`, verified.id, recordError);
      });

    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
