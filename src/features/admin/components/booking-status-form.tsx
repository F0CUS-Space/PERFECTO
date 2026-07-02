"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BookingStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateBookingStatus } from "@/features/admin/actions";

const STATUSES: { value: BookingStatus; label: string }[] = [
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function BookingStatusForm({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, status);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="booking-status">Update status</Label>
        <select
          id="booking-status"
          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as BookingStatus)}
          disabled={pending}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" onClick={onSave} disabled={pending || status === currentStatus}>
        {pending ? "Saving…" : "Save status"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
