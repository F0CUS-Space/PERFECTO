import "server-only";

import Stripe from "stripe";

import { getStripe } from "@/lib/stripe";

import type {
  CreateDepositCheckoutInput,
  DepositCheckoutSession,
  PaymentProvider,
  PaymentService,
  RefundPaymentInput,
  RefundResult,
} from "./payment-service";

export class StripePaymentService implements PaymentService {
  async createDepositCheckoutSession(
    input: CreateDepositCheckoutInput,
  ): Promise<DepositCheckoutSession> {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: input.amountCents,
              product_data: {
                name: `${input.serviceName} — full payment`,
                description: "Perfecto Cleaning Services booking payment",
              },
            },
          },
        ],
        customer_email: input.customerEmail ?? undefined,
        client_reference_id: input.bookingId,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          bookingId: input.bookingId,
          paymentId: input.paymentId,
          userId: input.userId,
          type: "DEPOSIT",
        },
        payment_intent_data: {
          metadata: {
            bookingId: input.bookingId,
            paymentId: input.paymentId,
            userId: input.userId,
            type: "DEPOSIT",
          },
        },
      },
      {
        idempotencyKey: input.idempotencyKey,
      },
    );

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return { url: session.url, sessionId: session.id };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundResult> {
    const stripe = getStripe();

    const refund = await stripe.refunds.create(
      {
        payment_intent: input.paymentIntentId,
        ...(input.amountCents !== undefined ? { amount: input.amountCents } : {}),
        ...(input.reason ? { metadata: { reason: input.reason } } : {}),
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      refundId: refund.id,
      status: refund.status ?? "pending",
      amountCents: refund.amount,
    };
  }

  async voidCheckoutSession(sessionId: string): Promise<void> {
    const stripe = getStripe();
    try {
      await stripe.checkout.sessions.expire(sessionId);
    } catch (error) {
      // A session that is already completed/expired cannot be expired again — that's fine.
      if (error instanceof Stripe.errors.StripeInvalidRequestError) return;
      throw error;
    }
  }
}

// Provider registry — add new providers here without touching call sites.
const services: Partial<Record<PaymentProvider, PaymentService>> = {};

function createService(provider: PaymentProvider): PaymentService {
  switch (provider) {
    case "stripe":
      return new StripePaymentService();
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}

/** Returns the payment provider implementation (defaults to Stripe in V1.0). */
export function getPaymentService(provider: PaymentProvider = "stripe"): PaymentService {
  const existing = services[provider];
  if (existing) return existing;

  const service = createService(provider);
  services[provider] = service;
  return service;
}
