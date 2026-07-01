import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import {
  createSessionCookie,
  SESSION_EXPIRES_MS,
  verifySessionCookie,
} from "@/lib/firebase/admin";
import type { User } from "@prisma/client";

const SESSION_COOKIE = SESSION_COOKIE_NAME;

function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/**
 * Resolves the currently authenticated user from the Firebase session cookie.
 * Returns null when unauthenticated or the session is invalid/expired.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await verifySessionCookie(token);
    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    return user;
  } catch {
    return null;
  }
}

/** Store a Firebase session cookie after the client completes phone OTP. */
export async function setSessionFromIdToken(idToken: string) {
  const sessionCookie = await createSessionCookie(idToken);
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    sessionCookie,
    sessionCookieOptions(Math.floor(SESSION_EXPIRES_MS / 1000)),
  );
}

/** Clear the session cookie on logout. */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
}

export { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
