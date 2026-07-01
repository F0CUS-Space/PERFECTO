"use client";

import { useState } from "react";
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

  const onPay = async () => {
    setError(null);
    setLoading(true);

    const result = await createDepositCheckout(bookingId);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    window.location.href = result.url;
  };

  return (
    <div className="space-y-2">
      <Button className="w-full sm:w-auto" size="lg" onClick={onPay} disabled={disabled || loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to Stripe…
          </>
        ) : (
          `Pay deposit ${formatCurrency(depositAmountCents)}`
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
