"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ApplicationStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateApplicationStatus } from "@/features/admin/actions";

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "ACCEPTED", label: "Accept" },
  { value: "REJECTED", label: "Reject" },
];

function saveButtonLabel(status: ApplicationStatus): string {
  switch (status) {
    case "ACCEPTED":
      return "Accept & notify applicant";
    case "REJECTED":
      return "Reject & notify applicant";
    case "UNDER_REVIEW":
      return "Mark under review & notify";
    default:
      return "Save status";
  }
}

export function ApplicationStatusForm({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, status);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.emailFailed) {
        setNotice("Status saved, but the email could not be sent (check RESEND_API_KEY).");
      } else if (result.notified) {
        setNotice("Status saved and the applicant was notified.");
      } else {
        setNotice("Status saved.");
      }
      router.refresh();
    });
  };

  const isFinal = currentStatus === "ACCEPTED" || currentStatus === "REJECTED";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="application-status">Decision</Label>
        <select
          id="application-status"
          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          disabled={pending || isFinal}
        >
          <option value="SUBMITTED" disabled>
            Submitted (awaiting review)
          </option>
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {!isFinal && (
        <>
          <Button
            type="button"
            onClick={onSave}
            disabled={pending || status === currentStatus || status === "SUBMITTED"}
          >
            {pending ? "Saving…" : saveButtonLabel(status)}
          </Button>
          <p className="text-xs text-muted-foreground">
            Each status change sends an update email to the applicant.
          </p>
        </>
      )}
      {isFinal && (
        <p className="text-sm text-muted-foreground">
          This application is closed. The applicant was notified by email.
        </p>
      )}
      {notice && <p className="text-sm text-brand-green">{notice}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
