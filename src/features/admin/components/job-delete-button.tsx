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
        ? `"${jobTitle}" has ${applicationCount} application(s). The job will be deactivated, application records kept, and uploaded resume files removed. Continue?`
        : `Deactivate "${jobTitle}" and remove it from the careers page?`;

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
      <p className="font-medium text-brand-navy">Remove job</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Deactivates this posting. Application records stay in the admin; only uploaded resume files
        are deleted from storage.
      </p>
      <Button
        type="button"
        variant="destructive"
        className="mt-4"
        onClick={onDelete}
        disabled={pending}
      >
        {pending ? "Removing…" : "Deactivate job"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
