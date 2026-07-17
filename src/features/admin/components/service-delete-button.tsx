"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteService } from "@/features/admin/actions";

export function ServiceDeleteButton({
  serviceId,
  serviceName,
  bookingCount,
  isActive,
}: {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  isActive: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    let message: string;
    if (!isActive) {
      message =
        bookingCount > 0
          ? `Permanently delete inactive service "${serviceName}"? This will also remove ${bookingCount} booking(s) and related records (payments, photos, quotes, offers). This cannot be undone.`
          : `Permanently delete inactive service "${serviceName}"? This cannot be undone.`;
    } else if (bookingCount > 0) {
      message = `"${serviceName}" has ${bookingCount} booking(s). It will be deactivated instead of deleted. Continue?`;
    } else {
      message = `Permanently delete "${serviceName}"? This cannot be undone.`;
    }

    if (!window.confirm(message)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteService(serviceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/services");
      router.refresh();
    });
  };

  const label = pending
    ? "Removing…"
    : !isActive
      ? "Delete permanently"
      : bookingCount > 0
        ? "Deactivate service"
        : "Delete service";

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={onDelete} disabled={pending}>
        {label}
      </Button>
      {!isActive && (
        <p className="text-sm text-muted-foreground">
          Inactive services can be removed permanently, including any bookings under this service.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
