"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { reconcileBookingPayment } from "@/features/admin/actions";

export function ReconcilePaymentButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onReconcile = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await reconcileBookingPayment(bookingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice("Payment reconciled.");
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
        onClick={onReconcile}
        disabled={pending}
      >
        {pending ? "Reconciling…" : "Reconcile Stripe payment"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Pulls paid Checkout / PaymentIntent state from Stripe for stuck pending bookings.
      </p>
      {notice && <p className="text-sm text-brand-green">{notice}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
