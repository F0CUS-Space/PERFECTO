"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

import { createDepositCheckout } from "../actions";

interface PayDepositButtonProps {
  bookingId: string;
  depositAmountCents: number;
  disabled?: boolean;
}

export function PayDepositButton({
  bookingId,
  depositAmountCents,
  disabled,
}: PayDepositButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const onPay = async () => {
    if (inFlight.current || loading || disabled) return;

    inFlight.current = true;
    setError(null);
    setLoading(true);

    try {
      const result = await createDepositCheckout(bookingId);

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        inFlight.current = false;
        if (result.alreadyPaid) {
          window.location.reload();
        }
        return;
      }

      window.location.assign(result.url);
    } catch {
      setError("Unable to start checkout. Please try again.");
      setLoading(false);
      inFlight.current = false;
    }
  };

  return (
    <div className="space-y-2">
      <Button
        className="w-full sm:w-auto"
        size="lg"
        onClick={onPay}
        disabled={disabled || loading}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to Stripe…
          </>
        ) : (
          `Pay now ${formatCurrency(depositAmountCents)}`
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
