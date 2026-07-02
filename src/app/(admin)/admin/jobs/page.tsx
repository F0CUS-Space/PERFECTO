import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getAdminJobPostings } from "@/features/admin/queries";
import { cn } from "@/lib/utils";
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

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Applications</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No jobs yet.{" "}
                  <Link href="/admin/jobs/new" className="text-brand-blue hover:underline">
                    Create your first job
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{job.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{job.location}</td>
                  <td className="px-4 py-3 text-muted-foreground">{job.applicationCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        job.isActive
                          ? "bg-accent/15 text-brand-green"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {job.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="font-medium text-brand-blue hover:underline"
                    >
                      Edit
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
