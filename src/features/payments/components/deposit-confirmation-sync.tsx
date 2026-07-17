"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { syncCheckoutSession } from "../actions";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 16; // ~40s before we stop and show a manual fallback.

/**
 * After Stripe redirect, actively reconciles via session_id (not just refresh).
 * Bounded: after MAX_POLLS it stops and surfaces a manual refresh / contact fallback.
 */
export function DepositConfirmationSync({
  active,
  bookingId,
  sessionId,
}: {
  active: boolean;
  bookingId: string;
  sessionId?: string | null;
}) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!active) return;

    setGaveUp(false);
    let polls = 0;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      polls += 1;

      const result = await syncCheckoutSession({
        bookingId,
        sessionId,
      }).catch(() => null);

      if (cancelled) return;

      if (result?.ok && (result.depositSatisfied || result.bookingConfirmed)) {
        router.refresh();
        return;
      }

      if (polls >= MAX_POLLS) {
        setGaveUp(true);
        return;
      }

      router.refresh();
      window.setTimeout(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    };

    void tick();

    return () => {
      cancelled = true;
    };
  }, [active, bookingId, sessionId, router]);

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
          void syncCheckoutSession({ bookingId, sessionId }).finally(() => {
            router.refresh();
          });
        }}
        className="mt-2 font-semibold text-amber-900 underline underline-offset-4"
      >
        Refresh now
      </button>
    </div>
  );
}
