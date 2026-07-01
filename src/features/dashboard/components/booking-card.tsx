import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

import { BookingStatusBadge } from "./booking-status-badge";
import type { CustomerBookingSummary } from "../types";

export function BookingCard({ booking }: { booking: CustomerBookingSummary }) {
  const balanceDue = Math.max(booking.totalAmount - booking.amountPaid, 0);
  const needsDeposit = booking.status === "PENDING_PAYMENT" && booking.amountPaid < booking.depositAmount;

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-brand-navy">{booking.serviceName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · {booking.arrivalWindow}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {booking.addressLine}, {booking.city}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Paid </span>
          <span className="font-semibold text-brand-navy">
            {formatCurrency(booking.amountPaid)}
          </span>
          <span className="text-muted-foreground"> of {formatCurrency(booking.totalAmount)}</span>
          {balanceDue > 0 && booking.amountPaid >= booking.depositAmount ? (
            <span className="ml-2 text-muted-foreground">
              · Balance {formatCurrency(balanceDue)}
            </span>
          ) : null}
        </div>
        <Button asChild size="sm" variant={needsDeposit ? "default" : "outline"}>
          <Link href={needsDeposit ? `/book/confirmation/${booking.id}` : `/dashboard/bookings/${booking.id}`}>
            {needsDeposit ? "Pay deposit" : "View"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
