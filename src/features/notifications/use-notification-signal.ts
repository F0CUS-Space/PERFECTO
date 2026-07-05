"use client";

import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { getFirebaseFirestore, isFirebaseConfigured } from "@/lib/firebase/client";

/**
 * Listens for Firestore notification signals instead of aggressive HTTP polling.
 * Falls back silently when Firestore is unavailable.
 */
export function useNotificationSignal(
  userId: string | undefined,
  onSignal: () => void,
) {
  useEffect(() => {
    if (!userId || !isFirebaseConfigured()) return;

    let unsubscribe: (() => void) | undefined;

    try {
      const db = getFirebaseFirestore();
      const ref = doc(db, "notificationSignals", userId);
      unsubscribe = onSnapshot(
        ref,
        () => onSignal(),
        () => {
          // Permission or network errors — caller may use fallback polling.
        },
      );
    } catch {
      // Firestore not initialized.
    }

    return () => unsubscribe?.();
  }, [userId, onSignal]);
}
