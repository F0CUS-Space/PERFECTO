import type { Role } from "@prisma/client";

/** Safe user subset exposed to the client after authentication. */
export interface PublicUser {
  id: string;
  /** Firebase Auth UID — used for Firestore notification signals (null until first OTP login). */
  firebaseUid: string | null;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  phoneVerifiedAt: string | null;
  emailVerifiedAt: string | null;
}
