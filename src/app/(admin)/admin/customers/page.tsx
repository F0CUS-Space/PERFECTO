import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getAdminCustomers } from "@/features/admin/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Customers — Admin" };

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const customers = await getAdminCustomers(q);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Customers</h1>
      <p className="mt-2 text-muted-foreground">Search and view customer accounts.</p>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="q" className="text-sm font-medium text-brand-navy">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, phone, or email…"
            className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
          />
        </div>
        <Button type="submit">Search</Button>
        {q && (
          <Button asChild variant="outline">
            <Link href="/admin/customers">Clear</Link>
          </Button>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Bookings</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Joined</th>
              <th className="px-4 py-3 font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((customer) => {
                const name =
                  [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={customer.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-navy">{name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.bookingCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
