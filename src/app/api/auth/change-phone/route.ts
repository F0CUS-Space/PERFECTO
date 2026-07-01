import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyIdToken } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, setSessionFromIdToken } from "@/server/auth";

const bodySchema = z.object({
  idToken: z.string().min(1),
});

/** Updates the signed-in user's phone after Firebase OTP verification on the new number. */
export async function POST(request: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { idToken } = bodySchema.parse(await request.json());
    const claims = await verifyIdToken(idToken);
    const newPhone = claims.phone_number;

    if (!newPhone) {
      return NextResponse.json({ error: "Phone number missing from verification." }, { status: 400 });
    }

    if (newPhone === sessionUser.phone) {
      return NextResponse.json({ error: "This is already your phone number." }, { status: 400 });
    }

    const taken = await prisma.user.findFirst({
      where: { phone: newPhone, NOT: { id: sessionUser.id } },
    });

    if (taken) {
      return NextResponse.json(
        { error: "That phone number is already registered to another account." },
        { status: 409 },
      );
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        phone: newPhone,
        phoneVerifiedAt: new Date(),
        firebaseUid: claims.uid,
      },
    });

    await setSessionFromIdToken(idToken);

    return NextResponse.json({ ok: true, phone: newPhone });
  } catch (error) {
    console.error("[auth/change-phone]", error);
    const message = error instanceof Error ? error.message : "Unable to update phone.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
