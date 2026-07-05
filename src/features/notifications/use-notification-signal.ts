"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type Unsubscribe as AuthUnsubscribe } from "firebase/auth";
import { doc, onSnapshot, type Unsubscribe as FirestoreUnsubscribe } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseFirestore, isFirebaseConfigured } from "@/lib/firebase/client";

const SIGNAL_DEBOUNCE_MS = 400;

type SignalCallback = () => void;
type RealtimeListener = (active: boolean) => void;

/** Module singleton — one Firestore listener per tab regardless of how many bells mount. */
interface SignalManager {
  firebaseUid: string | null;
  callbacks: Set<SignalCallback>;
  authUnsub: AuthUnsubscribe | null;
  firestoreUnsub: FirestoreUnsubscribe | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  lastVersion: number | null;
  realtimeActive: boolean;
  realtimeListeners: Set<RealtimeListener>;
}

let manager: SignalManager | null = null;

function getManager(): SignalManager {
  if (!manager) {
    manager = {
      firebaseUid: null,
      callbacks: new Set(),
      authUnsub: null,
      firestoreUnsub: null,
      debounceTimer: null,
      lastVersion: null,
      realtimeActive: false,
      realtimeListeners: new Set(),
    };
  }
  return manager;
}

function notifyRealtimeActive(m: SignalManager) {
  for (const listener of m.realtimeListeners) {
    listener(m.realtimeActive);
  }
}

function scheduleSignal(m: SignalManager) {
  if (m.debounceTimer) clearTimeout(m.debounceTimer);
  m.debounceTimer = setTimeout(() => {
    m.debounceTimer = null;
    for (const callback of m.callbacks) {
      callback();
    }
  }, SIGNAL_DEBOUNCE_MS);
}

function detachFirestore(m: SignalManager) {
  if (m.firestoreUnsub) {
    m.firestoreUnsub();
    m.firestoreUnsub = null;
  }
  m.lastVersion = null;
  if (m.realtimeActive) {
    m.realtimeActive = false;
    notifyRealtimeActive(m);
  }
}

function attachFirestore(m: SignalManager, firebaseUid: string) {
  if (m.firestoreUnsub) return;

  try {
    const db = getFirebaseFirestore();
    const ref = doc(db, "notificationSignals", firebaseUid);

    m.firestoreUnsub = onSnapshot(
      ref,
      (snapshot) => {
        const version = snapshot.data()?.version;
        if (typeof version !== "number") return;

        // Skip the initial snapshot — initial load is handled by the bell.
        if (m.lastVersion === null) {
          m.lastVersion = version;
          return;
        }

        if (version !== m.lastVersion) {
          m.lastVersion = version;
          scheduleSignal(m);
        }
      },
      () => {
        detachFirestore(m);
      },
    );

    m.realtimeActive = true;
    notifyRealtimeActive(m);
  } catch {
    detachFirestore(m);
  }
}

function teardownManager(m: SignalManager) {
  if (m.debounceTimer) {
    clearTimeout(m.debounceTimer);
    m.debounceTimer = null;
  }
  detachFirestore(m);
  m.authUnsub?.();
  m.authUnsub = null;
  m.firebaseUid = null;
  m.callbacks.clear();
}

function subscribeToSignal(firebaseUid: string, callback: SignalCallback): () => void {
  const m = getManager();

  if (m.firebaseUid && m.firebaseUid !== firebaseUid && m.callbacks.size > 0) {
    teardownManager(m);
  }

  m.firebaseUid = firebaseUid;
  m.callbacks.add(callback);

  if (!m.authUnsub) {
    try {
      const auth = getFirebaseAuth();
      m.authUnsub = onAuthStateChanged(auth, (authUser) => {
        if (authUser?.uid === m.firebaseUid) {
          attachFirestore(m, m.firebaseUid!);
        } else {
          detachFirestore(m);
        }
      });
    } catch {
      // Realtime stays inactive; callers fall back to HTTP polling.
    }
  }

  return () => {
    m.callbacks.delete(callback);
    if (m.callbacks.size === 0) {
      teardownManager(m);
    }
  };
}

/**
 * Realtime Firestore listener for notification signals.
 * Subscribes only when Firebase client auth UID matches the expected firebaseUid.
 * Returns whether realtime is active (false → caller should use HTTP fallback poll).
 */
export function useNotificationSignal(
  firebaseUid: string | null | undefined,
  onSignal: () => void,
): boolean {
  const [realtimeActive, setRealtimeActive] = useState(false);
  const onSignalRef = useRef(onSignal);
  onSignalRef.current = onSignal;

  useEffect(() => {
    if (!firebaseUid || !isFirebaseConfigured()) {
      setRealtimeActive(false);
      return;
    }

    const m = getManager();
    const wrappedCallback = () => onSignalRef.current();

    const onRealtimeChange: RealtimeListener = (active) => setRealtimeActive(active);
    m.realtimeListeners.add(onRealtimeChange);
    setRealtimeActive(m.realtimeActive);

    const unsubSignal = subscribeToSignal(firebaseUid, wrappedCallback);

    return () => {
      m.realtimeListeners.delete(onRealtimeChange);
      unsubSignal();
    };
  }, [firebaseUid]);

  return realtimeActive;
}
