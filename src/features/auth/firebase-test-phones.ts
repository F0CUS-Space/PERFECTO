/** Test phones for local development — bypasses Firebase SMS via Admin custom tokens. */
export const ADMIN_TEST_PHONE = "+10000000000";

export const FIREBASE_TEST_PHONES = [
  { phone: ADMIN_TEST_PHONE, otp: "123123", label: "Admin (login only)" },
  { phone: "+10000000001", otp: "123123", label: "Customer signup" },
  { phone: "+10000000002", otp: "123123", label: "Customer signup" },
] as const;

export const CUSTOMER_TEST_PHONES = ["+10000000001", "+10000000002"] as const;

export function isAuthDevMode(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_DEV_MODE === "true";
}

export function isFirebaseTestPhone(phone: string): boolean {
  return FIREBASE_TEST_PHONES.some((t) => t.phone === phone);
}

export function isAdminTestPhone(phone: string): boolean {
  return phone === ADMIN_TEST_PHONE;
}

export function isCustomerTestPhone(phone: string): boolean {
  return (CUSTOMER_TEST_PHONES as readonly string[]).includes(phone);
}

export function getTestPhoneOtp(phone: string): string | undefined {
  return FIREBASE_TEST_PHONES.find((t) => t.phone === phone)?.otp;
}

export function validateTestOtp(phone: string, otp: string): boolean {
  return getTestPhoneOtp(phone) === otp;
}

/** Map Firebase Auth error codes to user-friendly copy. */
export function formatFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  const message = err instanceof Error ? err.message : "Something went wrong.";

  switch (code) {
    case "auth/operation-not-allowed":
      return (
        "Phone SMS sign-in failed. With NEXT_PUBLIC_AUTH_DEV_MODE=true, use test numbers " +
        "(+10000000000 admin login, +10000000001/+10000000002 customer signup) and OTP 123123."
      );
    case "auth/invalid-phone-number":
      return "That phone number format is not valid. Use E.164 format, e.g. +10000000000.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/invalid-verification-code":
      return "Invalid verification code. For test numbers use OTP 123123.";
    case "auth/code-expired":
      return "That code has expired. Request a new one.";
    case "auth/captcha-check-failed":
      return "Security check failed. Refresh the page and try again.";
    default:
      return message.replace(/^Firebase:\s*/i, "").replace(/\s*\(auth\/[^)]+\)\.?\s*$/, ".");
  }
}
