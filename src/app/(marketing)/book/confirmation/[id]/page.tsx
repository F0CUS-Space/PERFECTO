import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { PayDepositButton } from "@/features/payments/components/pay-deposit-button";
import { DepositConfirmationSync } from "@/features/payments/components/deposit-confirmation-sync";
import { AppliedPromotionSummary } from "@/features/promotions/components/applied-promotion-summary";
import { getBookingPaymentStateFromDb } from "@/features/payments/booking-payment-state";
import { reconcileBookingPayments } from "@/features/payments/services/reconcile-payments";
import { isStripeConfigured } from "@/lib/stripe-ready";
import { displayArrivalTime } from "@/lib/format-arrival-time";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Booking Confirmation",
  description: "Your Perfecto booking confirmation and payment.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}

async function loadBooking(id: string, userId: string) {
  return prisma.booking.findFirst({
    where: { id, userId },
    include: {
      service: true,
      agreement: true,
      invoice: true,
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
}

export default async function BookingConfirmationPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/book")}`);
  }

  const { id } = await params;
  const { checkout } = await searchParams;

  if (!isDatabaseConfigured()) {
    notFound();
  }

  let booking = await loadBooking(id, user.id);
  if (!booking) {
    notFound();
  }

  // Stripe reconcile only when returning from checkout — webhooks handle the normal path.
  const paymentState =
    checkout === "success" && booking.status === "PENDING_PAYMENT"
      ? await reconcileBookingPayments(booking.id).catch(() =>
          getBookingPaymentStateFromDb(booking!.id, {
            totalAmount: booking!.totalAmount,
            depositAmount: booking!.depositAmount,
            status: booking!.status,
          }),
        )
      : await getBookingPaymentStateFromDb(booking.id, {
          totalAmount: booking.totalAmount,
          depositAmount: booking.depositAmount,
          status: booking.status,
        });

  if (checkout === "success") {
    booking = await loadBooking(id, user.id);
    if (!booking) {
      notFound();
    }
  }

  const isConfirmed = booking.status === "CONFIRMED";
  const fullyPaid = paymentState.fullyPaid;
  const amountDue = Math.max(booking.totalAmount - paymentState.amountPaid, 0);
  const showPayNow = !fullyPaid && !paymentState.depositSatisfied && booking.status === "PENDING_PAYMENT";
  const paymentsEnabled = isStripeConfigured();
  const awaitingConfirmation = checkout === "success" && !paymentState.depositSatisfied;

  return (
    <>
      <PageHero
        title={fullyPaid ? "Paid in full" : isConfirmed ? "Booking confirmed" : "Booking created"}
        description={
          fullyPaid
            ? "Your booking is fully paid and scheduled."
            : isConfirmed
              ? "Your payment was received and your clean is scheduled."
              : "Pay in full to secure your appointment."
        }
      />
      <Section>
        <DepositConfirmationSync active={awaitingConfirmation} />
        <Card className="mx-auto max-w-2xl border-accent/30">
          <CardHeader>
            <CardTitle>{booking.service.name}</CardTitle>
            <CardDescription>
              Reference {booking.id.slice(0, 8).toUpperCase()} ·{" "}
              {fullyPaid ? "Paid in full" : isConfirmed ? "Confirmed" : "Pending payment"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {awaitingConfirmation && (
              <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                Payment received — confirming your booking now. This usually takes a few seconds.
              </p>
            )}

            {checkout === "cancelled" && showPayNow && (
              <p className="rounded-xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                Checkout was cancelled. Your booking is saved — pay when you&apos;re ready.
              </p>
            )}

            {fullyPaid && !isConfirmed && (
              <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-brand-navy">
                We received your payment. Refresh if this message persists.
              </p>
            )}

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-medium text-brand-navy">
                  {booking.scheduledDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Arrival time</dt>
                <dd className="font-medium text-brand-navy">{displayArrivalTime(booking.arrivalWindow)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Address</dt>
                <dd className="font-medium text-brand-navy">
                  {booking.addressLine}
                  <br />
                  {booking.city}, {booking.postalCode}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-medium text-brand-navy">
                  {formatCurrency(booking.totalAmount)}
                </dd>
              </div>
              {booking.promotionTitle && booking.promotionDiscountCents > 0 && (
                <div className="sm:col-span-2">
                  <AppliedPromotionSummary
                    title={booking.promotionTitle}
                    discountCents={booking.promotionDiscountCents}
                    compact
                  />
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Paid so far</dt>
                <dd className="text-lg font-bold tabular-nums text-primary">
                  {formatCurrency(paymentState.amountPaid)}
                </dd>
              </div>
              {!fullyPaid && (
                <div>
                  <dt className="text-muted-foreground">Amount due</dt>
                  <dd className="font-medium text-brand-navy">{formatCurrency(amountDue)}</dd>
                </div>
              )}
              {booking.invoice && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Invoice</dt>
                  <dd className="font-medium text-brand-navy">
                    {booking.invoice.number}
                    {" · "}
                    <a
                      href={`/api/invoices/${booking.id}/download`}
                      download={`${booking.invoice.number}.pdf`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Download PDF
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {booking.agreement && (
              <p className="rounded-xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                Signed by{" "}
                <span className="font-medium text-brand-navy">{booking.agreement.signatureName}</span>{" "}
                on{" "}
                {booking.agreement.signedAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                .
              </p>
            )}

            {showPayNow && (
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4">
                <p className="font-medium text-brand-navy">Complete your payment</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Secure checkout via Stripe. Full payment is required to confirm your booking.
                </p>
                {paymentsEnabled ? (
                  <div className="mt-3">
                    <PayDepositButton
                      bookingId={booking.id}
                      depositAmountCents={booking.depositAmount}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-destructive">
                    Payments are not configured. Add STRIPE_SECRET_KEY to the server environment.
                  </p>
                )}
              </div>
            )}

            {isConfirmed && !fullyPaid && (
              <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-brand-navy">
                Payment received — you&apos;re all set! We&apos;ll see you on{" "}
                {booking.scheduledDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                during {displayArrivalTime(booking.arrivalWindow)}.
              </p>
            )}

            {fullyPaid && (
              <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-brand-navy">
                Paid in full — no balance remaining. We&apos;ll see you on{" "}
                {booking.scheduledDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                during {displayArrivalTime(booking.arrivalWindow)}.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
