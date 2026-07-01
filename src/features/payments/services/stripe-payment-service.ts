import "server-only";

import { getStripe } from "@/lib/stripe";

import type {
  CreateDepositCheckoutInput,
  DepositCheckoutSession,
  PaymentService,
} from "./payment-service";

export class StripePaymentService implements PaymentService {
  async createDepositCheckoutSession(
    input: CreateDepositCheckoutInput,
  ): Promise<DepositCheckoutSession> {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: input.amountCents,
            product_data: {
              name: `${input.serviceName} — 50% deposit`,
              description: "Perfecto Cleaning Services booking deposit",
            },
          },
        },
      ],
      customer_email: input.customerEmail ?? undefined,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        bookingId: input.bookingId,
        paymentId: input.paymentId,
        userId: input.userId,
        type: "DEPOSIT",
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return { url: session.url, sessionId: session.id };
  }
}

let stripePaymentService: StripePaymentService | undefined;

export function getPaymentService(): PaymentService {
  if (!stripePaymentService) {
    stripePaymentService = new StripePaymentService();
  }
  return stripePaymentService;
}
