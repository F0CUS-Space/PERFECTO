import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth";
import { toPublicUser } from "@/features/auth/user-sync";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: toPublicUser(user) });
}
