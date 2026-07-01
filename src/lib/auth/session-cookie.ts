import type { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { SESSION_EXPIRES_MS } from "@/lib/firebase/admin";

/** Whether session cookies use the Secure flag (HTTPS only). */
export function sessionCookieSecure(): boolean {
  if (process.env.SESSION_COOKIE_SECURE === "true") return true;
  if (process.env.SESSION_COOKIE_SECURE === "false") return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return appUrl.startsWith("https://");
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Attach a Firebase session cookie to a Route Handler response (required for browsers to receive it). */
export function attachSessionCookie(response: NextResponse, sessionCookie: string) {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    sessionCookie,
    sessionCookieOptions(Math.floor(SESSION_EXPIRES_MS / 1000)),
  );
  return response;
}
