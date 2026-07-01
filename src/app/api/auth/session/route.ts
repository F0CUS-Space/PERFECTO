import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyIdToken } from "@/lib/firebase/admin";
import { setSessionFromIdToken } from "@/server/auth";
import { toPublicUser, upsertUserFromFirebaseClaims } from "@/features/auth/user-sync";

const bodySchema = z.object({
  idToken: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { idToken } = bodySchema.parse(json);

    const claims = await verifyIdToken(idToken);
    const { user, isNewUser } = await upsertUserFromFirebaseClaims(claims);
    await setSessionFromIdToken(idToken);

    return NextResponse.json({
      user: toPublicUser(user),
      isNewUser,
      needsProfile: !user.firstName,
    });
  } catch (error) {
    console.error("[auth/session]", error);
    const message = error instanceof Error ? error.message : "Unable to create session.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
