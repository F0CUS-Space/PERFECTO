import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyIdToken } from "@/lib/firebase/admin";
import type { User } from "@prisma/client";

const SESSION_COOKIE = "perfecto_session";

/**
 * Resolves the currently authenticated user from the Firebase session cookie/ID token.
 *
 * The session cookie stores a Firebase ID token. We verify it server-side on every
 * request (never trust the client) and map it to the local User row by firebaseUid.
 *
 * Returns null when unauthenticated. Auth wiring is completed in Milestone 2.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await verifyIdToken(token);
    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    return user;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
