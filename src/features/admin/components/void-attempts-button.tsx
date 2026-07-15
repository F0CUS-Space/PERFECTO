"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { voidCheckoutAttempts } from "@/features/admin/actions";

export function VoidAttemptsButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onVoid = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await voidCheckoutAttempts(bookingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice("Pending checkout attempts voided.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onVoid}
        disabled={pending}
      >
        {pending ? "Voiding…" : "Void pending checkout attempts"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Expires any open Stripe checkout for this booking so the customer can start fresh.
      </p>
      {notice && <p className="text-sm text-brand-green">{notice}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
