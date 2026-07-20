import "server-only";

import Stripe from "stripe";

import { env, requireEnv } from "@/env";
import { getStripe } from "@/lib/stripe";

import {
  confirmDepositFromCheckoutSession,
  markCheckoutSessionFailed,
  markDepositFailed,
  releaseExpiredCheckoutSession,
} from "../confirm-deposit";
import { finalizeRefundFromCharge } from "../refunds";
import { PAYMENT_EVENT, PAYMENT_EVENT_LABEL, type PaymentEventType } from "../domain-events";
import type { PaymentProvider } from "../payment-service";
import {
  WebhookNotConfiguredError,
  WebhookVerificationError,
  type ProviderWebhookHandler,
  type VerifiedWebhook,
} from "./provider-webhook";

/** Maps a native Stripe event type to our provider-agnostic domain event. */
function classify(eventType: string): PaymentEventType {
  switch (eventType) {
    case "checkout.session.completed":
    // Defense-in-depth: card Checkout is paid on completed, but if async methods
    // are ever enabled, confirmation must wait for this event.
    case "checkout.session.async_payment_succeeded":
      return PAYMENT_EVENT.DEPOSIT_PAID;
    case "checkout.session.async_payment_failed":
    case "payment_intent.payment_failed":
      return PAYMENT_EVENT.DEPOSIT_FAILED;
    case "checkout.session.expired":
      return PAYMENT_EVENT.CHECKOUT_EXPIRED;
    case "charge.refunded":
      return PAYMENT_EVENT.REFUND_SETTLED;
    default:
      return PAYMENT_EVENT.IGNORED;
  }
}

export class StripeWebhookHandler implements ProviderWebhookHandler {
  readonly provider: PaymentProvider = "stripe";

  async verify(rawBody: string, headers: Headers): Promise<VerifiedWebhook> {
    if (!env.STRIPE_WEBHOOK_SECRET?.trim()) {
      throw new WebhookNotConfiguredError("STRIPE_WEBHOOK_SECRET is not set.");
    }

    const signature = headers.get("stripe-signature");
    if (!signature) {
      throw new WebhookVerificationError("Missing stripe-signature header.");
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        requireEnv("STRIPE_WEBHOOK_SECRET"),
      );
    } catch (error) {
      // Log only the message — the raw error/payload is not needed and could carry request data.
      const message = error instanceof Error ? error.message : String(error);
      console.error("[webhooks/stripe] signature verification failed:", message);
      throw new WebhookVerificationError("Invalid signature.");
    }

    return {
      id: event.id,
      type: event.type,
      handle: () => this.dispatch(event),
    };
  }

  private async dispatch(event: Stripe.Event): Promise<void> {
    const domainEvent = classify(event.type);

    switch (domainEvent) {
      case PAYMENT_EVENT.DEPOSIT_PAID: {
        const session = event.data.object as Stripe.Checkout.Session;
        // Accept DEPOSIT (and legacy/missing type when bookingId is present) so a
        // paid Checkout Session always confirms even if metadata was incomplete.
        const type = session.metadata?.type;
        const hasBooking = Boolean(session.metadata?.bookingId);
        if (type === "DEPOSIT" || type === "BOOKING" || (!type && hasBooking)) {
          await confirmDepositFromCheckoutSession(session);
        }
        return;
      }
      case PAYMENT_EVENT.DEPOSIT_FAILED: {
        if (event.type === "checkout.session.async_payment_failed") {
          const session = event.data.object as Stripe.Checkout.Session;
          await markCheckoutSessionFailed(session.id);
        } else {
          const intent = event.data.object as Stripe.PaymentIntent;
          await markDepositFailed(intent.id);
        }
        return;
      }
      case PAYMENT_EVENT.CHECKOUT_EXPIRED: {
        const session = event.data.object as Stripe.Checkout.Session;
        await releaseExpiredCheckoutSession(session.id);
        return;
      }
      case PAYMENT_EVENT.REFUND_SETTLED: {
        const charge = event.data.object as Stripe.Charge;
        await finalizeRefundFromCharge(charge);
        return;
      }
      default:
        console.info(
          `[webhooks/stripe] ${PAYMENT_EVENT_LABEL[domainEvent]} — ignoring event ${event.type}`,
        );
        return;
    }
  }
}
