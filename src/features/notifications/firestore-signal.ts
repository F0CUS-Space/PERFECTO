import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

const COLLECTION = "notificationSignals";
/** Limit parallel Firestore writes during bulk notification fan-out. */
const BUMP_CONCURRENCY = 20;

/** Bump a Firestore signal keyed by Firebase Auth UID (matches security rules). */
export async function bumpNotificationSignalByFirebaseUid(firebaseUid: string): Promise<void> {
  if (!firebaseUid.trim()) return;

  try {
    const db = getFirebaseAdminFirestore();
    await db
      .collection(COLLECTION)
      .doc(firebaseUid)
      .set(
        {
          version: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (error) {
    console.error("[notifications] Firestore signal failed", firebaseUid, error);
  }
}

async function resolveFirebaseUidsForDbUsers(dbUserIds: string[]): Promise<string[]> {
  const unique = [...new Set(dbUserIds)];
  if (unique.length === 0) return [];

  const rows = await prisma.user.findMany({
    where: { id: { in: unique }, firebaseUid: { not: null } },
    select: { firebaseUid: true },
  });

  return [...new Set(
    rows
      .map((row) => row.firebaseUid)
      .filter((uid): uid is string => Boolean(uid)),
  )];
}

/** Bump signal for a Postgres user when they have a linked Firebase UID. */
export async function bumpNotificationSignalForDbUser(dbUserId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: dbUserId },
    select: { firebaseUid: true },
  });

  if (!user?.firebaseUid) return;
  await bumpNotificationSignalByFirebaseUid(user.firebaseUid);
}

/** Bump signals for many Postgres users (skips users without firebaseUid). */
export async function bumpNotificationSignalsForDbUsers(dbUserIds: string[]): Promise<void> {
  const firebaseUids = await resolveFirebaseUidsForDbUsers(dbUserIds);
  if (firebaseUids.length === 0) return;

  for (let i = 0; i < firebaseUids.length; i += BUMP_CONCURRENCY) {
    const chunk = firebaseUids.slice(i, i + BUMP_CONCURRENCY);
    await Promise.all(chunk.map((uid) => bumpNotificationSignalByFirebaseUid(uid)));
  }
}
