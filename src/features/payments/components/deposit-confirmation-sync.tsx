"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Polls for webhook/sync completion after Stripe redirect. */
export function DepositConfirmationSync({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [active, router]);

  return null;
}
