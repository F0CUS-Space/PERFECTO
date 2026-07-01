"use client";

import Link from "next/link";
import { Download, Loader2 } from "lucide-react";

import type { PaymentStatus, PaymentType } from "@prisma/client";
import { useCustomerPayments } from "@/features/dashboard/hooks/use-customer-payments";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<PaymentType, string> = {
  DEPOSIT: "Payment",
  BALANCE: "Balance",
  REFUND: "Refund",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "text-amber-700",
  SUCCEEDED: "text-brand-green",
  FAILED: "text-destructive",
  REFUNDED: "text-muted-foreground",
};

export function PaymentsTableClient() {
  const { data: payments, isLoading, error } = useCustomerPayments();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading payments…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Unable to load payments. Please refresh the page.
      </p>
    );
  }

  if (!payments?.length) {
    return (
      <p className="rounded-xl bg-secondary/60 px-4 py-8 text-center text-sm text-muted-foreground">
        No payments yet. They will appear here after you book and pay.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border bg-secondary/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">Invoice</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-brand-navy">
                {new Date(payment.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/bookings/${payment.bookingId}`}
                  className="font-medium text-brand-navy hover:underline"
                >
                  {payment.serviceName}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {TYPE_LABELS[payment.type]}
              </td>
              <td className="px-4 py-3 font-medium tabular-nums text-brand-navy">
                {formatCurrency(payment.amount)}
              </td>
              <td className={cn("px-4 py-3 font-medium capitalize", STATUS_STYLES[payment.status])}>
                {payment.status.toLowerCase()}
              </td>
              <td className="px-4 py-3">
                {payment.invoiceNumber && payment.status === "SUCCEEDED" ? (
                  <a
                    href={`/api/invoices/${payment.bookingId}/download`}
                    className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {payment.invoiceNumber}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
