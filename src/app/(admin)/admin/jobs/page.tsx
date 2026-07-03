import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PaginatedJobsTable } from "@/features/admin/components/paginated-lists";
import { getAdminJobPostings } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Jobs — Admin" };

export default async function AdminJobsPage() {
  await requireAdmin();
  const jobs = await getAdminJobPostings();

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">Job postings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage roles shown on the careers page and apply form.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/jobs/new">Add job</Link>
        </Button>
      </div>

      <div className="mt-8">
        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No jobs yet.{" "}
            <Link href="/admin/jobs/new" className="text-brand-blue hover:underline">
              Create your first job
            </Link>
            .
          </div>
        ) : (
          <PaginatedJobsTable jobs={jobs} />
        )}
      </div>
    </div>
  );
}
