import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth";
import { toPublicUser } from "@/features/auth/user-sync";

/** Returns the current user, or null — always 200 (401 is reserved for protected mutations). */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user: user ? toPublicUser(user) : null });
}
