import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApplicationStatusForm } from "@/features/admin/components/application-status-form";
import { getAdminApplicationById } from "@/features/admin/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_STYLES = {
  SUBMITTED: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-brand-blue/10 text-brand-blue",
  ACCEPTED: "bg-accent/15 text-brand-green",
  REJECTED: "bg-destructive/10 text-destructive",
} as const;

export default async function AdminApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const application = await getAdminApplicationById(id);

  if (!application) {
    notFound();
  }

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/applications">← Back to applications</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{application.fullName}</CardTitle>
                <CardDescription>{application.position}</CardDescription>
              </div>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                  STATUS_STYLES[application.status],
                )}
              >
                {application.status.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium text-brand-navy">{application.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium text-brand-navy">{application.phone}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Applied</dt>
                <dd className="font-medium text-brand-navy">
                  {new Date(application.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>

            {application.coverNote && (
              <div className="rounded-xl bg-secondary/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cover note
                </p>
                <p className="mt-2 whitespace-pre-wrap text-brand-navy">{application.coverNote}</p>
              </div>
            )}

            {application.priorApplications.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-medium">Previous applications from this email</p>
                <ul className="mt-2 space-y-1">
                  {application.priorApplications.map((prior) => (
                    <li key={prior.id}>
                      <Link
                        href={`/admin/applications/${prior.id}`}
                        className="text-brand-blue hover:underline"
                      >
                        {prior.position}
                      </Link>{" "}
                      — {prior.status.replace(/_/g, " ").toLowerCase()} (
                      {new Date(prior.createdAt).toLocaleDateString()})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {application.resumeViewUrl && (
              <Button asChild variant="outline">
                <a href={application.resumeViewUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                  View resume
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationStatusForm
              applicationId={application.id}
              currentStatus={application.status}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
