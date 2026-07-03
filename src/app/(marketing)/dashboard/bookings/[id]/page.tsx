import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookingStatusBadge } from "@/features/dashboard/components/booking-status-badge";
import { BookingManagePanel } from "@/features/dashboard/components/booking-manage-panel";
import { BookingReviewForm } from "@/features/dashboard/components/booking-review-form";
import { getCustomerBookingById } from "@/features/dashboard/queries";
import { PayDepositButton } from "@/features/payments/components/pay-deposit-button";
import { displayArrivalTime } from "@/lib/format-arrival-time";
import { isStripeConfigured } from "@/lib/stripe-ready";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ review?: string }>;
}

export default async function DashboardBookingDetailPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const { review } = await searchParams;
  const booking = await getCustomerBookingById(user.id, id);

  if (!booking) {
    notFound();
  }

  const amountDue = Math.max(booking.totalAmount - booking.amountPaid, 0);
  const needsPayment = !booking.depositSatisfied && booking.status === "PENDING_PAYMENT";
  const paymentsEnabled = isStripeConfigured();
  const canReview = booking.canReview;

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/dashboard/bookings">← Back to bookings</Link>
      </Button>

      <Card className="mx-auto max-w-2xl border-accent/30">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{booking.serviceName}</CardTitle>
              <CardDescription>
                Reference {booking.id.slice(0, 8).toUpperCase()}
              </CardDescription>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium text-brand-navy">
                {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Arrival time</dt>
              <dd className="font-medium text-brand-navy">
                {displayArrivalTime(booking.arrivalWindow)}
              </dd>
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
              <dt className="text-muted-foreground">Property</dt>
              <dd className="font-medium text-brand-navy">
                {booking.bedrooms} bed · {booking.bathrooms} bath
                {booking.hasPets ? " · Pets" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-medium text-brand-navy">
                {formatCurrency(booking.totalAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid so far</dt>
              <dd className="text-lg font-bold tabular-nums text-primary">
                {formatCurrency(booking.amountPaid)}
              </dd>
            </div>
            {!booking.fullyPaid && (
              <div>
                <dt className="text-muted-foreground">Amount due</dt>
                <dd className="font-medium text-brand-navy">{formatCurrency(amountDue)}</dd>
              </div>
            )}
          </dl>

          {booking.signatureName && booking.signedAt && (
            <p className="rounded-xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              Signed by{" "}
              <span className="font-medium text-brand-navy">{booking.signatureName}</span> on{" "}
              {new Date(booking.signedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              .
            </p>
          )}

          {needsPayment && (
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4">
              <p className="font-medium text-brand-navy">Complete your payment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Secure checkout via Stripe. Full payment is required to confirm your appointment.
              </p>
              {paymentsEnabled ? (
                <div className="mt-3">
                  <PayDepositButton
                    bookingId={booking.id}
                    depositAmountCents={booking.depositAmount}
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-destructive">Payments are not configured.</p>
              )}
            </div>
          )}

          {booking.fullyPaid && (
            <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-brand-navy">
              Paid in full — no balance remaining.
            </p>
          )}

          <BookingManagePanel
            bookingId={booking.id}
            scheduledDate={booking.scheduledDate}
            arrivalWindow={booking.arrivalWindow}
            canCancel={booking.canCancel}
            canReschedule={booking.canReschedule}
          />

          {booking.status === "CANCELLED" && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              This booking was cancelled.
            </p>
          )}

          {canReview && (
            <BookingReviewForm
              bookingId={booking.id}
              serviceName={booking.serviceName}
              autoFocus={review === "1"}
            />
          )}

          {booking.hasReview && (
            <p className="rounded-xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              Thanks — you already submitted a review for this booking.
            </p>
          )}

          {booking.invoiceNumber && booking.depositSatisfied && (
            <Button asChild variant="outline">
              <a href={`/api/invoices/${booking.id}/download`}>
                <Download className="h-4 w-4" />
                Download invoice {booking.invoiceNumber}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
