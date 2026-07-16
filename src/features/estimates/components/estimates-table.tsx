"use client";

import Link from "next/link";
import type { BookingOfferStatus } from "@prisma/client";

import { LIST_LOAD_MORE, LIST_PAGE_SIZE } from "@/config/list-display";
import { ViewMoreSection } from "@/components/shared/view-more";
import { formatCurrency, cn } from "@/lib/utils";
import type { EstimateListRow } from "@/features/estimates/types";

const STATUS_STYLES: Record<BookingOfferStatus, string> = {
  DRAFT: "bg-secondary text-muted-foreground",
  SENT: "bg-brand-blue/10 text-brand-blue",
  CONVERTED: "bg-accent/15 text-brand-green",
  CANCELLED: "bg-destructive/10 text-destructive",
  EXPIRED: "bg-amber-100 text-amber-800",
};

function formatStatus(status: BookingOfferStatus): string {
  return status.replace(/_/g, " ").toLowerCase();
}

export function EstimatesTable({ estimates }: { estimates: EstimateListRow[] }) {
  return (
    <ViewMoreSection
      items={estimates}
      initialCount={LIST_PAGE_SIZE.TABLE}
      step={LIST_LOAD_MORE.TABLE}
      itemLabel="estimates"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {visible.map((estimate) => (
                <tr key={estimate.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{estimate.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {estimate.customerEmail ?? estimate.customerPhone ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{estimate.serviceName}</td>
                  <td className="px-4 py-3 tabular-nums">{formatCurrency(estimate.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        STATUS_STYLES[estimate.status],
                      )}
                    >
                      {formatStatus(estimate.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(estimate.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/estimates/${estimate.id}`}
                      className="font-medium text-brand-blue hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}
