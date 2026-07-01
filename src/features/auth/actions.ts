"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/rbac";
import { profileSchema, type ProfileInput } from "@/features/auth/schemas";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Save name and optional email after phone verification. Email verification is optional. */
export async function updateProfile(input: ProfileInput): Promise<ProfileActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const user = await requireUser();
  const { firstName, lastName, email } = parsed.data;
  const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : null;
  const emailChanged = normalizedEmail !== (user.email?.toLowerCase() ?? null);

  if (normalizedEmail) {
    const taken = await prisma.user.findFirst({
      where: { email: normalizedEmail, NOT: { id: user.id } },
    });
    if (taken) {
      return { ok: false, error: "That email is already registered to another account." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName,
      lastName: lastName?.trim() || null,
      email: normalizedEmail,
      ...(emailChanged ? { emailVerifiedAt: null } : {}),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/login");

  return { ok: true };
}

/** Mark email as verified after the client confirms Firebase email verification. */
export async function markEmailVerified(): Promise<ProfileActionResult> {
  const user = await requireUser();
  if (!user.email) {
    return { ok: false, error: "No email on file." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}
