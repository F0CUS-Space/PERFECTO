import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PaginatedCustomerBookingsTable } from "@/features/admin/components/paginated-lists";
import { getAdminCustomerById } from "@/features/admin/queries";

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
        {customer.bookings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No bookings yet.
          </div>
        ) : (
          <div className="mt-4">
            <PaginatedCustomerBookingsTable bookings={customer.bookings} />
          </div>
        )}
      </section>
    </div>
  );
}
