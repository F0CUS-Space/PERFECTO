import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { sessionCookieOptions } from "@/lib/auth/session-cookie";
import { prisma } from "@/lib/prisma";
import {
  createSessionCookie,
  SESSION_EXPIRES_MS,
  verifySessionCookie,
} from "@/lib/firebase/admin";
import type { User } from "@prisma/client";

const SESSION_COOKIE = SESSION_COOKIE_NAME;

/**
 * Resolves the currently authenticated user from the Firebase session cookie.
 * Cached per request so layouts and pages share one verify + DB lookup.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = await verifySessionCookie(token);

    let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });

    // Fallback: link session to local user by phone (seeded accounts, uid drift after phone change).
    if (!user && decoded.phone_number) {
      const byPhone = await prisma.user.findUnique({ where: { phone: decoded.phone_number } });
      if (byPhone) {
        user = await prisma.user.update({
          where: { id: byPhone.id },
          data: {
            firebaseUid: decoded.uid,
            phoneVerifiedAt: byPhone.phoneVerifiedAt ?? new Date(),
          },
        });
      }
    }

    return user;
  } catch (error) {
    console.error("[getCurrentUser]", error);
    return null;
  }
});

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
  cookieStore.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
    expires: new Date(0),
  });
}

export { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
