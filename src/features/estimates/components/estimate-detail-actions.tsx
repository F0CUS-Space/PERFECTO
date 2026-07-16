"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cancelBookingOffer, sendBookingOffer } from "@/features/estimates/actions";
import type { EstimateDetail } from "@/features/estimates/types";

export function EstimateDetailActions({ estimate }: { estimate: EstimateDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSend = estimate.status === "DRAFT" || estimate.status === "SENT";
  const canCancel =
    estimate.status === "DRAFT" || estimate.status === "SENT" || estimate.status === "EXPIRED";

  const absolutePayLink =
    typeof window !== "undefined"
      ? `${window.location.origin}${estimate.payLinkPath}`
      : estimate.payLinkPath;

  const copyLink = async () => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}${estimate.payLinkPath}`
          : estimate.payLinkPath;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the pay link.");
    }
  };

  const onSend = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendBookingOffer(estimate.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        result.emailSkipped
          ? "Estimate marked sent (email skipped — RESEND_API_KEY not set)."
          : "Estimate email sent.",
      );
      router.refresh();
    });
  };

  const onCancel = () => {
    if (!window.confirm("Cancel this estimate? The pay link will stop working.")) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await cancelBookingOffer(estimate.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Estimate cancelled.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canSend && (
          <Button type="button" disabled={pending} onClick={onSend}>
            {estimate.status === "SENT" ? "Resend email" : "Send email"}
          </Button>
        )}
        <Button type="button" variant="outline" disabled={pending} onClick={() => void copyLink()}>
          {copied ? (
            <>
              <Check className="mr-1 h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 h-4 w-4" />
              Copy pay link
            </>
          )}
        </Button>
        {estimate.bookingId && (
          <Button asChild variant="outline">
            <Link href={`/admin/bookings/${estimate.bookingId}`}>View booking</Link>
          </Button>
        )}
        {canCancel && (
          <Button type="button" variant="destructive" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <p className="break-all text-xs text-muted-foreground">{absolutePayLink}</p>

      {message && <p className="text-sm text-brand-green">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
