"use client";

import { Tag } from "lucide-react";

import { formatCurrency } from "@/lib/utils";

type AppliedPromotionProps = {
  title: string;
  discountCents: number;
  compact?: boolean;
};

/** Shows a claimed promotion on booking summaries and detail pages. */
export function AppliedPromotionSummary({
  title,
  discountCents,
  compact,
}: AppliedPromotionProps) {
  if (discountCents <= 0) return null;

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-accent/30 bg-accent/5 px-3 py-2"
          : "rounded-xl border border-accent/30 bg-accent/5 px-4 py-3"
      }
    >
      <div className="flex items-start gap-2">
        <Tag className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-navy">Promotion applied</p>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-sm font-semibold text-accent">
            −{formatCurrency(discountCents)} discount
          </p>
        </div>
      </div>
    </div>
  );
}
