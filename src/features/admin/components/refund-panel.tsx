"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { refundPayment } from "@/features/admin/actions";

interface RefundPanelProps {
  bookingId: string;
  refundableCents: number;
}

export function RefundPanel({ bookingId, refundableCents }: RefundPanelProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState((refundableCents / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    setError(null);
    setNotice(null);

    const amountDollars = Number(amount);
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    if (Math.round(amountDollars * 100) > refundableCents) {
      setError(`Refund cannot exceed ${formatCurrency(refundableCents)}.`);
      return;
    }

    startTransition(async () => {
      const result = await refundPayment({
        bookingId,
        amountDollars,
        reason: reason.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice("Refund issued. The customer has been emailed.");
      setConfirming(false);
      setReason("");
      router.refresh();
    });
  };

  if (refundableCents <= 0) {
    return <p className="text-sm text-muted-foreground">Nothing left to refund.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Up to {formatCurrency(refundableCents)} can be refunded to the customer&apos;s original
        payment method.
      </p>

      <div className="space-y-2">
        <Label htmlFor="refund-amount">Refund amount (USD)</Label>
        <Input
          id="refund-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="refund-reason">Reason (optional)</Label>
        <Textarea
          id="refund-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer cancelled outside the 48h window"
          disabled={pending}
        />
      </div>

      {!confirming ? (
        <Button
          type="button"
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          disabled={pending}
        >
          Refund payment
        </Button>
      ) : (
        <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-brand-navy">
            Refund {formatCurrency(Math.round(Number(amount) * 100) || 0)} to the customer? This
            cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={onSubmit}
              disabled={pending}
            >
              {pending ? "Refunding…" : "Confirm refund"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {notice && <p className="text-sm text-brand-green">{notice}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
