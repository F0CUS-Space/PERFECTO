import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAdminCustomerById } from "@/features/admin/queries";
import { BookingStatusBadge } from "@/features/dashboard/components/booking-status-badge";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const customer = await getAdminCustomerById(id);

  if (!customer) {
    notFound();
  }

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.phone;

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/customers">← Back to customers</Link>
      </Button>

      <h1 className="text-3xl font-bold text-brand-navy">{name}</h1>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="font-medium text-brand-navy">{customer.phone}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium text-brand-navy">{customer.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Member since</dt>
          <dd className="font-medium text-brand-navy">
            {new Date(customer.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total bookings</dt>
          <dd className="font-medium text-brand-navy">{customer.bookingCount}</dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-brand-navy">Bookings</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Paid</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {customer.bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No bookings yet.
                  </td>
                </tr>
              ) : (
                customer.bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-navy">{booking.serviceName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(booking.scheduledDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(booking.amountPaid)} / {formatCurrency(booking.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="text-brand-blue hover:underline"
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
      </section>
    </div>
  );
}
