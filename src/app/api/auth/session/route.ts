import { NextResponse } from "next/server";
import { z } from "zod";

import { attachSessionCookie } from "@/lib/auth/session-cookie";
import { verifyIdToken, createSessionCookie } from "@/lib/firebase/admin";
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
    const sessionCookie = await createSessionCookie(idToken);

    const response = NextResponse.json({
      user: toPublicUser(user),
      isNewUser,
      needsProfile: !user.firstName,
    });

    attachSessionCookie(response, sessionCookie);
    return response;
  } catch (error) {
    console.error("[auth/session]", error);
    const message = error instanceof Error ? error.message : "Unable to create session.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
