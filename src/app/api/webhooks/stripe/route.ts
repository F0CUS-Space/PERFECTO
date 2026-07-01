import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  confirmDepositFromCheckoutSession,
  markDepositFailed,
} from "@/features/payments/services/confirm-deposit";
import { getStripe } from "@/lib/stripe";
import { requireEnv } from "@/env";

export const runtime = "nodejs";

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "DEPOSIT") {
          await confirmDepositFromCheckoutSession(session);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await markDepositFailed(intent.id);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhooks/stripe] handler error", event.type, error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
