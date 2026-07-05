import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

const COLLECTION = "notificationSignals";

/** Bump a user's Firestore signal so clients refresh without polling. */
export async function bumpNotificationSignal(userId: string): Promise<void> {
  try {
    const db = getFirebaseAdminFirestore();
    await db
      .collection(COLLECTION)
      .doc(userId)
      .set(
        {
          version: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (error) {
    console.error("[notifications] Firestore signal failed", userId, error);
  }
}

export async function bumpNotificationSignals(userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds)];
  await Promise.all(unique.map((userId) => bumpNotificationSignal(userId)));
}
