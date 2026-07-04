import Image from "next/image";
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
import { BookingStatusForm } from "@/features/admin/components/booking-status-form";
import { getAdminBookingById } from "@/features/admin/queries";
import { BookingStatusBadge } from "@/features/dashboard/components/booking-status-badge";
import { AppliedPromotionSummary } from "@/features/promotions/components/applied-promotion-summary";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const booking = await getAdminBookingById(id);

  if (!booking) {
    notFound();
  }

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/bookings">← Back to bookings</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{booking.serviceName}</CardTitle>
                  <CardDescription>
                    Ref {booking.id.slice(0, 8).toUpperCase()} · Booked{" "}
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="font-medium text-brand-navy">
                    <Link href={`/admin/customers/${booking.customerId}`} className="hover:underline">
                      {booking.customerName}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium text-brand-navy">{booking.customerPhone}</dd>
                </div>
                {booking.customerEmail && (
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium text-brand-navy">{booking.customerEmail}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Scheduled</dt>
                  <dd className="font-medium text-brand-navy">
                    {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    · {booking.arrivalWindow}
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
                {booking.petNotes && (
                  <div>
                    <dt className="text-muted-foreground">Pet notes</dt>
                    <dd className="font-medium text-brand-navy">{booking.petNotes}</dd>
                  </div>
                )}
                {booking.accessInfo && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Access</dt>
                    <dd className="font-medium text-brand-navy">{booking.accessInfo}</dd>
                  </div>
                )}
                {booking.specialInstructions && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Special instructions</dt>
                    <dd className="font-medium text-brand-navy">{booking.specialInstructions}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {booking.photos.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property photos</CardTitle>
                <CardDescription>
                  Uploaded by the customer during booking ({booking.photos.length})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {booking.photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square overflow-hidden rounded-xl border border-border"
                    >
                      <Image
                        src={photo.viewUrl}
                        alt="Property photo"
                        fill
                        className="object-cover"
                        sizes="200px"
                        unoptimized
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property photos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No photos were uploaded for this booking.
                </p>
              </CardContent>
            </Card>
          )}

          {booking.agreement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agreement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Signed by{" "}
                  <span className="font-medium text-brand-navy">
                    {booking.agreement.signatureName}
                  </span>{" "}
                  on{" "}
                  {new Date(booking.agreement.signedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {booking.agreement.acceptedTerms && <li>Service agreement accepted</li>}
                  {booking.agreement.acceptedCancellation && <li>Cancellation policy accepted</li>}
                  {booking.agreement.acceptedLiability && <li>Liability policy accepted</li>}
                </ul>
                {booking.agreement.ipAddress && (
                  <p className="text-xs text-muted-foreground">IP: {booking.agreement.ipAddress}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {booking.promotionTitle && booking.promotionDiscountCents > 0 && (
                <AppliedPromotionSummary
                  title={booking.promotionTitle}
                  discountCents={booking.promotionDiscountCents}
                  compact
                />
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{formatCurrency(booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-semibold text-brand-green">
                  {formatCurrency(booking.amountPaid)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {booking.fullyPaid ? "Paid in full" : "Payment incomplete"}
              </p>
              {booking.invoiceNumber && (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a
                    href={`/api/invoices/${booking.id}/download`}
                    download={`${booking.invoiceNumber}.pdf`}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF invoice
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingStatusForm bookingId={booking.id} currentStatus={booking.status} />
            </CardContent>
          </Card>

          {booking.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment attempts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {booking.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2"
                  >
                    <span className="capitalize text-muted-foreground">
                      {payment.type.toLowerCase()} · {payment.status.toLowerCase()}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
