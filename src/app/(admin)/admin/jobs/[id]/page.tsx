import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobDeleteButton } from "@/features/admin/components/job-delete-button";
import { JobEditForm } from "@/features/admin/components/job-edit-form";
import { getAdminJobPostingById } from "@/features/admin/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await getAdminJobPostingById(id);

  if (!job) {
    notFound();
  }

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/jobs">← Back to jobs</Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-brand-navy">{job.title}</h1>
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
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" /> {job.type}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {job.location}
              </span>
            </div>
            <p className="mt-4 text-muted-foreground">{job.summary}</p>
          </div>

          <JobEditForm job={job} />
          <JobDeleteButton
            jobId={job.id}
            jobTitle={job.title}
            applicationCount={job.applicationCount}
          />
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5 text-sm">
          <p className="font-medium text-brand-navy">Preview link</p>
          <p className="mt-2 text-muted-foreground">
            Applicants can apply with this role pre-selected:
          </p>
          <Link
            href={`/careers/apply?position=${encodeURIComponent(job.title)}`}
            className="mt-3 inline-block break-all text-brand-blue hover:underline"
            target="_blank"
          >
            /careers/apply?position={encodeURIComponent(job.title)}
          </Link>
        </aside>
      </div>
    </div>
  );
}
