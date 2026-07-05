import "server-only";

import { Role, type User } from "@prisma/client";
import type { DecodedIdToken } from "firebase-admin/auth";

import { prisma } from "@/lib/prisma";
import type { PublicUser } from "@/features/auth/types";

/**
 * Maps a verified Firebase user (phone sign-in) to a local User row.
 * Links seeded accounts by phone when firebaseUid is not yet set.
 */
export async function upsertUserFromFirebaseClaims(
  claims: DecodedIdToken,
): Promise<{ user: User; isNewUser: boolean }> {
  const phone = claims.phone_number;
  if (!phone) {
    throw new Error("Phone number missing from Firebase token. Complete phone verification first.");
  }

  const byUid = await prisma.user.findUnique({ where: { firebaseUid: claims.uid } });
  if (byUid) {
    const user = await prisma.user.update({
      where: { id: byUid.id },
      data: {
        phone,
        phoneVerifiedAt: byUid.phoneVerifiedAt ?? new Date(),
      },
    });
    return { user, isNewUser: !user.firstName };
  }

  const byPhone = await prisma.user.findUnique({ where: { phone } });
  if (byPhone) {
    const user = await prisma.user.update({
      where: { id: byPhone.id },
      data: {
        firebaseUid: claims.uid,
        phoneVerifiedAt: byPhone.phoneVerifiedAt ?? new Date(),
      },
    });
    return { user, isNewUser: !user.firstName };
  }

  const user = await prisma.user.create({
    data: {
      phone,
      firebaseUid: claims.uid,
      phoneVerifiedAt: new Date(),
      role: Role.CUSTOMER,
    },
  });

  return { user, isNewUser: true };
}

/** Safe subset returned to the client after auth. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    phone: user.phone,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  };
}
