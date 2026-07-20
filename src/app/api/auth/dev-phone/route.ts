import { NextResponse } from "next/server";
import { z } from "zod";

import { Role } from "@prisma/client";

import {
  ADMIN_TEST_PHONE,
  isCustomerTestPhone,
  validateTestOtp,
} from "@/features/auth/firebase-test-phones";
import { isServerAuthDevMode } from "@/features/auth/dev-mode";
import { toPublicUser } from "@/features/auth/user-sync";
import {
  createCustomTokenForUid,
  getOrCreateFirebaseUserByPhone,
} from "@/lib/firebase/admin";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  phone: z.string().trim(),
  otp: z.string().trim(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
});

/**
 * Development-only phone auth: validates test OTP server-side and returns a
 * Firebase custom token (no SMS, no reCAPTCHA). Disabled in production.
 */
export async function POST(request: Request) {
  if (!isServerAuthDevMode()) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const limit = await rateLimit(`auth-dev-phone:${getRequestIp(request)}`, 30, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const json = await request.json();
    const { phone, otp, firstName, lastName, email } = bodySchema.parse(json);

    if (!validateTestOtp(phone, otp)) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 401 });
    }

    const isRegister = Boolean(firstName?.length);
    const isAdminPhone = phone === ADMIN_TEST_PHONE;

    if (isRegister && isAdminPhone) {
      return NextResponse.json(
        { error: "Use Login (not Sign Up) for the admin test number +10000000000." },
        { status: 400 },
      );
    }

    if (isRegister && !isCustomerTestPhone(phone)) {
      return NextResponse.json(
        { error: "Customer signup: use +10000000001 or +10000000002." },
        { status: 400 },
      );
    }

    if (!isRegister && !isAdminPhone && isCustomerTestPhone(phone)) {
      // Allow login with customer test phones if account already exists.
    }

    const firebaseUser = await getOrCreateFirebaseUserByPhone(phone);
    const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : null;

    const existing = await prisma.user.findUnique({ where: { phone } });

    if (isRegister) {
      if (!firstName?.trim() || !lastName?.trim()) {
        return NextResponse.json(
          { error: "First name and last name are required." },
          { status: 400 },
        );
      }

      if (normalizedEmail) {
        const taken = await prisma.user.findFirst({
          where: { email: normalizedEmail, NOT: { phone } },
        });
        if (taken) {
          return NextResponse.json({ error: "That email is already in use." }, { status: 400 });
        }
      }

      await prisma.user.upsert({
        where: { phone },
        update: {
          firebaseUid: firebaseUser.uid,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phoneVerifiedAt: new Date(),
          role: Role.CUSTOMER,
        },
        create: {
          phone,
          firebaseUid: firebaseUser.uid,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phoneVerifiedAt: new Date(),
          role: Role.CUSTOMER,
        },
      });
    } else if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          firebaseUid: firebaseUser.uid,
          phoneVerifiedAt: existing.phoneVerifiedAt ?? new Date(),
        },
      });
    } else if (isAdminPhone) {
      return NextResponse.json(
        { error: "Admin account not found. Run: npm run db:seed" },
        { status: 400 },
      );
    } else {
      return NextResponse.json(
        { error: "No account for this number. Please sign up first." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json({ error: "Could not create account." }, { status: 500 });
    }

    const customToken = await createCustomTokenForUid(firebaseUser.uid);

    return NextResponse.json({
      customToken,
      user: toPublicUser(user),
      needsProfile: !user.firstName,
    });
  } catch (error) {
    console.error("[auth/dev-phone]", error);
    const message = error instanceof Error ? error.message : "Dev sign-in failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
