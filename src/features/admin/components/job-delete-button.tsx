"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteJobPosting } from "@/features/admin/actions";

export function JobDeleteButton({
  jobId,
  jobTitle,
  applicationCount,
}: {
  jobId: string;
  jobTitle: string;
  applicationCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    const message =
      applicationCount > 0
        ? `"${jobTitle}" has ${applicationCount} application(s). It will be deactivated instead of deleted. Continue?`
        : `Delete "${jobTitle}" permanently?`;

    if (!window.confirm(message)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteJobPosting(jobId);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/admin/jobs");
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <p className="font-medium text-brand-navy">Delete job</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {applicationCount > 0
          ? "Jobs with applications are deactivated so past applications keep their position name."
          : "Remove this job posting from the careers page."}
      </p>
      <Button
        type="button"
        variant="destructive"
        className="mt-4"
        onClick={onDelete}
        disabled={pending}
      >
        {pending ? "Removing…" : applicationCount > 0 ? "Deactivate job" : "Delete job"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
