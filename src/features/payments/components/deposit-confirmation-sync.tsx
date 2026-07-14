"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 13; // ~40s before we stop and show a manual fallback.

/**
 * Polls for webhook/sync completion after Stripe redirect. Bounded: after
 * MAX_POLLS it stops and surfaces a manual refresh / contact fallback instead of
 * spinning forever when a webhook is delayed or dropped.
 */
export function DepositConfirmationSync({ active }: { active: boolean }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!active) return;

    setGaveUp(false);
    let polls = 0;

    const interval = window.setInterval(() => {
      polls += 1;
      if (polls >= MAX_POLLS) {
        window.clearInterval(interval);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [active, router]);

  if (!active || !gaveUp) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">Still confirming your payment…</p>
      <p className="mt-1">
        This is taking longer than usual. Your payment is safe — if it went through, your booking
        will confirm automatically. You can refresh this page, or contact us if it doesn&apos;t
        update shortly.
      </p>
      <button
        type="button"
        onClick={() => {
          setGaveUp(false);
          router.refresh();
        }}
        className="mt-2 font-semibold text-amber-900 underline underline-offset-4"
      >
        Refresh now
      </button>
    </div>
  );
}
