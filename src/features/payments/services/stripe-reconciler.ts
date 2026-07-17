import "server-only";

import { env } from "@/env";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

import type { PaymentProvider } from "./payment-service";
import type { PaymentReconciler, SettledCapture } from "./payment-reconciler";

function captureFromSession(
  session: {
    id: string;
    amount_total: number | null;
    payment_status: string;
    metadata?: { bookingId?: string; paymentId?: string } | null;
    payment_intent?: string | { id?: string; amount?: number; amount_received?: number } | null;
  },
  bookingId: string,
): SettledCapture | null {
  if (session.payment_status !== "paid") return null;
  if (session.metadata?.bookingId && session.metadata.bookingId !== bookingId) return null;

  const paymentIntent = session.payment_intent;
  const intentAmount =
    typeof paymentIntent === "object" && paymentIntent
      ? Number(paymentIntent.amount_received || paymentIntent.amount) || 0
      : 0;
  const amountCents =
    typeof session.amount_total === "number" && session.amount_total > 0
      ? session.amount_total
      : intentAmount;
  if (amountCents <= 0) return null;

  return {
    providerPaymentId: session.id,
    providerPaymentIntentId:
      typeof paymentIntent === "string" ? paymentIntent : (paymentIntent?.id ?? null),
    amountCents,
    metadataPaymentId: session.metadata?.paymentId ?? null,
  };
}

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
        const capture = captureFromSession(session, bookingId);
        if (capture) byId.set(capture.providerPaymentId, capture);
      } catch {
        // Session may have been deleted or is invalid — ignore.
      }
    }

    // Orphan recovery: succeeded PaymentIntents tagged with this bookingId, even when
    // the Checkout Session was never written to providerPaymentId locally.
    try {
      const safeBookingId = bookingId.replace(/\\/g, "").replace(/"/g, "");
      const intents = await stripe.paymentIntents.search({
        query: `metadata["bookingId"]:"${safeBookingId}" AND status:"succeeded"`,
        limit: 20,
      });

      for (const intent of intents.data) {
        const amountCents = intent.amount_received || intent.amount || 0;
        if (amountCents <= 0) continue;

        // Prefer an existing session-linked capture for the same PI.
        const already = [...byId.values()].some(
          (capture) => capture.providerPaymentIntentId === intent.id,
        );
        if (already) continue;

        // Try to resolve the Checkout Session for a stable cs_ provider id.
        let providerPaymentId = intent.id;
        try {
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: intent.id,
            limit: 1,
          });
          const session = sessions.data[0];
          if (session?.id) {
            providerPaymentId = session.id;
            const fromSession = captureFromSession(
              { ...session, payment_intent: intent },
              bookingId,
            );
            if (fromSession) {
              byId.set(fromSession.providerPaymentId, fromSession);
              continue;
            }
          }
        } catch {
          // Fall through to PI-based capture.
        }

        byId.set(providerPaymentId, {
          providerPaymentId,
          providerPaymentIntentId: intent.id,
          amountCents,
          metadataPaymentId: intent.metadata?.paymentId ?? null,
        });
      }
    } catch (error) {
      // Search may be unavailable on some accounts — linked-session path still works.
      console.warn(
        "[stripe-reconciler] paymentIntents.search failed",
        bookingId,
        error instanceof Error ? error.message : error,
      );
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
