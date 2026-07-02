import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { getAdminApplications } from "@/features/admin/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Applications — Admin" };

const STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
];

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-brand-blue/10 text-brand-blue",
  ACCEPTED: "bg-accent/15 text-brand-green",
  REJECTED: "bg-destructive/10 text-destructive",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminApplicationsPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const statusFilter = STATUSES.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : undefined;

  const applications = await getAdminApplications({ status: statusFilter });

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Job applications</h1>
      <p className="mt-2 text-muted-foreground">Review candidates and send accept or reject emails.</p>

      <form className="mt-6 flex flex-wrap items-end gap-3">
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
        {statusFilter && (
          <Button asChild variant="outline">
            <Link href="/admin/applications">Clear</Link>
          </Button>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Applicant</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Position</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Applied</th>
              <th className="px-4 py-3 font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No applications yet.
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{app.fullName}</p>
                    <p className="text-xs text-muted-foreground">{app.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{app.position}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        STATUS_STYLES[app.status],
                      )}
                    >
                      {app.status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="font-medium text-brand-blue hover:underline"
                    >
                      Review
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
