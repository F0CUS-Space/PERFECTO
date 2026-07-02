"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteService } from "@/features/admin/actions";

export function ServiceDeleteButton({
  serviceId,
  serviceName,
  bookingCount,
}: {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    const message =
      bookingCount > 0
        ? `"${serviceName}" has ${bookingCount} booking(s). It will be deactivated instead of deleted. Continue?`
        : `Permanently delete "${serviceName}"? This cannot be undone.`;

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

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={onDelete} disabled={pending}>
        {pending ? "Removing…" : bookingCount > 0 ? "Deactivate service" : "Delete service"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
