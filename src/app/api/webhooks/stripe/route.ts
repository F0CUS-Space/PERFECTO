import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  confirmDepositFromCheckoutSession,
  markCheckoutSessionFailed,
  markDepositFailed,
  releaseExpiredCheckoutSession,
} from "@/features/payments/services/confirm-deposit";
import { finalizeRefundFromCharge } from "@/features/payments/services/refunds";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireEnv } from "@/env";

export const runtime = "nodejs";

/** Dispatches a verified Stripe event to the right handler. */
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type === "DEPOSIT") {
        await confirmDepositFromCheckoutSession(session);
      }
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await markCheckoutSessionFailed(session.id);
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await releaseExpiredCheckoutSession(session.id);
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await markDepositFailed(intent.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await finalizeRefundFromCharge(charge);
      break;
    }
    default:
      break;
  }
}

/** Stripe webhook — source of truth for deposit confirmation (not the client redirect). */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    console.error("[webhooks/stripe] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Idempotency: a redelivered event is processed at most once.
  const seen = await prisma.processedWebhookEvent
    .findUnique({ where: { id: event.id } })
    .catch(() => null);
  if (seen?.status === "PROCESSED") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleStripeEvent(event);

    await prisma.processedWebhookEvent.upsert({
      where: { id: event.id },
      create: { id: event.id, type: event.type, status: "PROCESSED" },
      update: { status: "PROCESSED", error: null, attempts: { increment: 1 } },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[webhooks/stripe] handler error", event.type, event.id, message);

    // Record the failure for ops visibility; returning 500 lets Stripe retry.
    await prisma.processedWebhookEvent
      .upsert({
        where: { id: event.id },
        create: { id: event.id, type: event.type, status: "FAILED", error: message },
        update: { status: "FAILED", error: message, attempts: { increment: 1 } },
      })
      .catch((recordError) => {
        console.error("[webhooks/stripe] failed to record event", event.id, recordError);
      });

    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
