import Link from "next/link";
import type { BookingStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { getAdminBookings } from "@/features/admin/queries";
import { BookingStatusBadge } from "@/features/dashboard/components/booking-status-badge";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bookings — Admin" };

const STATUSES: BookingStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const { status, q } = await searchParams;
  const statusFilter = STATUSES.includes(status as BookingStatus)
    ? (status as BookingStatus)
    : undefined;

  const bookings = await getAdminBookings({ status: statusFilter, q });

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Bookings</h1>
      <p className="mt-2 text-muted-foreground">Search and manage all customer bookings.</p>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="q" className="text-sm font-medium text-brand-navy">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Customer, phone, city, service…"
            className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className="text-sm font-medium text-brand-navy">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={statusFilter ?? ""}
            className="flex h-11 w-full min-w-[180px] rounded-xl border border-input bg-background px-4 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Filter</Button>
        {(q || statusFilter) && (
          <Button asChild variant="outline">
            <Link href="/admin/bookings">Clear</Link>
          </Button>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Scheduled</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Paid</th>
              <th className="px-4 py-3 font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No bookings found.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{booking.customerName}</p>
                    <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{booking.serviceName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    <br />
                    <span className="text-xs">{booking.arrivalWindow}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{booking.city}</td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCurrency(booking.amountPaid)} / {formatCurrency(booking.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="font-medium text-brand-blue hover:underline"
                    >
                      View
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
