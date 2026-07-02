import Link from "next/link";
import type { PaymentStatus, PaymentType } from "@prisma/client";

import { getAdminPayments } from "@/features/admin/queries";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payments — Admin" };

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

export default async function AdminPaymentsPage() {
  const payments = await getAdminPayments();

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Payments</h1>
      <p className="mt-2 text-muted-foreground">All payment activity across bookings.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No payments yet.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-navy">{payment.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{payment.serviceName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[payment.type]}</td>
                  <td className={cn("px-4 py-3 font-medium capitalize", STATUS_STYLES[payment.status])}>
                    {payment.status.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/bookings/${payment.bookingId}`}
                      className="text-brand-blue hover:underline"
                    >
                      Booking
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
