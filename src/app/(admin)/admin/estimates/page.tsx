import Link from "next/link";
import type { BookingOfferStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { EstimatesTable } from "@/features/estimates/components/estimates-table";
import { getAdminEstimates } from "@/features/estimates/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Estimates — Admin" };

const STATUSES: BookingOfferStatus[] = ["DRAFT", "SENT", "CONVERTED", "CANCELLED", "EXPIRED"];

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function AdminEstimatesPage({ searchParams }: PageProps) {
  const { status, q } = await searchParams;
  const statusFilter = STATUSES.includes(status as BookingOfferStatus)
    ? (status as BookingOfferStatus)
    : undefined;

  const estimates = await getAdminEstimates({ status: statusFilter, q });

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">Estimates</h1>
          <p className="mt-2 text-muted-foreground">
            Create priced offers, email pay links, and track conversions.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/estimates/new">New estimate</Link>
        </Button>
      </div>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="q" className="text-sm font-medium text-brand-navy">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Customer, email, phone, service…"
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
            <Link href="/admin/estimates">Clear</Link>
          </Button>
        )}
      </form>

      <div className="mt-6">
        {estimates.length === 0 ? (
          <div className="rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No estimates yet.{" "}
            <Link href="/admin/estimates/new" className="font-medium text-brand-blue hover:underline">
              Create one
            </Link>
          </div>
        ) : (
          <EstimatesTable estimates={estimates} />
        )}
      </div>
    </div>
  );
}
