"use client";

import { displayArrivalTime } from "@/lib/format-arrival-time";
import { formatCurrency } from "@/lib/utils";

import { AppliedPromotionSummary } from "@/features/promotions/components/applied-promotion-summary";
import type { QuoteDraft } from "@/features/quote/store";
import type { PropertyStepInput, ScheduleStepInput } from "../schema";

interface BookingSummaryProps {
  quote: QuoteDraft;
  property?: Partial<PropertyStepInput>;
  schedule?: Partial<ScheduleStepInput>;
  compact?: boolean;
}

export function BookingSummary({ quote, property, schedule, compact }: BookingSummaryProps) {
  const { calculation } = quote;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service</p>
        <p className="font-semibold text-brand-navy">{quote.serviceName}</p>
      </div>

      <ul className="space-y-1.5">
        {calculation.summary.map((item) => (
          <li key={item.label} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="text-right font-medium text-brand-navy">{item.value}</span>
          </li>
        ))}
      </ul>

      {!compact && property?.addressLine && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Address
          </p>
          <p className="font-medium text-brand-navy">
            {property.addressLine}
            <br />
            {property.city}, {property.postalCode}
          </p>
        </div>
      )}

      {!compact && schedule?.scheduledDate && schedule.arrivalWindow && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Schedule
          </p>
          <p className="font-medium text-brand-navy">
            {new Date(schedule.scheduledDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            <br />
            {displayArrivalTime(schedule.arrivalWindow)}
          </p>
        </div>
      )}

      {quote.promotionTitle && calculation.promotionDiscountCents > 0 && (
        <AppliedPromotionSummary
          title={quote.promotionTitle}
          discountCents={calculation.promotionDiscountCents}
          compact
        />
      )}

      <div className="border-t border-border pt-3">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-brand-navy">Estimated total</span>
          <span className="text-lg font-bold tabular-nums text-primary">
            {formatCurrency(calculation.estimatedTotalCents)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Full payment due when you confirm your booking
        </p>
      </div>
    </div>
  );
}
