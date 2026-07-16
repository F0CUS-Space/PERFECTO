import "server-only";

import { env } from "@/env";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

import type { PaymentProvider } from "./payment-service";
import type { PaymentReconciler, SettledCapture } from "./payment-reconciler";

export class StripeReconciler implements PaymentReconciler {
  readonly provider: PaymentProvider = "stripe";

  async findSettledCaptures(bookingId: string): Promise<SettledCapture[]> {
    if (!env.STRIPE_SECRET_KEY?.trim()) return [];

    const stripe = getStripe();
    const byId = new Map<string, SettledCapture>();

    const payments = await prisma.payment.findMany({
      where: { bookingId, providerPaymentId: { not: null } },
      select: { providerPaymentId: true },
    });

    for (const payment of payments) {
      const id = payment.providerPaymentId;
      if (!id?.startsWith("cs_")) continue;

      try {
        const session = await stripe.checkout.sessions.retrieve(id, {
          expand: ["payment_intent"],
        });
        if (session.metadata?.bookingId === bookingId && session.payment_status === "paid") {
          const paymentIntent = session.payment_intent;
          const intentAmount =
            typeof paymentIntent === "object" && paymentIntent && "amount" in paymentIntent
              ? Number(paymentIntent.amount) || 0
              : 0;
          byId.set(session.id, {
            providerPaymentId: session.id,
            providerPaymentIntentId:
              typeof paymentIntent === "string" ? paymentIntent : (paymentIntent?.id ?? null),
            amountCents: session.amount_total ?? intentAmount,
            metadataPaymentId: session.metadata?.paymentId ?? null,
          });
        }
      } catch {
        // Session may have been deleted or is invalid — ignore.
      }
    }

    return [...byId.values()];
  }
}

const reconcilers: Partial<Record<PaymentProvider, PaymentReconciler>> = {};

function createReconciler(provider: PaymentProvider): PaymentReconciler {
  switch (provider) {
    case "stripe":
      return new StripeReconciler();
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}

/** Returns the reconciler for a provider (defaults to Stripe in V1.0). */
export function getPaymentReconciler(provider: PaymentProvider = "stripe"): PaymentReconciler {
  const existing = reconcilers[provider];
  if (existing) return existing;

  const reconciler = createReconciler(provider);
  reconcilers[provider] = reconciler;
  return reconciler;
}
