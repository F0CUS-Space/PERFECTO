import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginatedApplicationsTable } from "@/features/admin/components/paginated-lists";
import { getAdminApplications } from "@/features/admin/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Applications — Admin" };

const STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
];

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function AdminApplicationsPage({ searchParams }: PageProps) {
  const { status, q } = await searchParams;
  const statusFilter = STATUSES.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : undefined;

  const applications = await getAdminApplications({ status: statusFilter, q });

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Job applications</h1>
      <p className="mt-2 text-muted-foreground">Review candidates and send hiring decisions.</p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="q" className="text-sm font-medium text-brand-navy">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, email, phone, position…"
            className="min-w-[220px]"
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
            className="flex h-11 min-w-[180px] rounded-xl border border-input bg-background px-4 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Filter</Button>
        {(statusFilter || q) && (
          <Button asChild variant="outline">
            <Link href="/admin/applications">Clear</Link>
          </Button>
        )}
      </form>

      <div className="mt-6">
        {applications.length === 0 ? (
          <div className="rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No applications found.
          </div>
        ) : (
          <PaginatedApplicationsTable applications={applications} />
        )}
      </div>
    </div>
  );
}
