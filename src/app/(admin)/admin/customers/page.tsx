import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PaginatedCustomersTable } from "@/features/admin/components/paginated-lists";
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

      <div className="mt-6">
        {customers.length === 0 ? (
          <div className="rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No customers found.
          </div>
        ) : (
          <PaginatedCustomersTable customers={customers} />
        )}
      </div>
    </div>
  );
}
