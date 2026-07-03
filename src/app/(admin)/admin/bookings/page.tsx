import Link from "next/link";
import type { BookingStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { PaginatedBookingsTable } from "@/features/admin/components/paginated-lists";
import { getAdminBookings } from "@/features/admin/queries";

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

      <div className="mt-6">
        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No bookings found.
          </div>
        ) : (
          <PaginatedBookingsTable bookings={bookings} />
        )}
      </div>
    </div>
  );
}
