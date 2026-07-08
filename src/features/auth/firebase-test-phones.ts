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

  // Backend error 39 = QuotaExceeded: Firebase's SMS abuse protection temporarily
  // blocks the request (per-IP/project rate limit, or a throttled carrier/region).
  // Surfaces as HTTP 503 with "Error code: 39" or auth/error-code:-39.
  if (code === "auth/error-code:-39" || /error[ -]?code:?\s*-?39\b/i.test(message)) {
    return (
      "We couldn't send a verification code right now because SMS is temporarily rate-limited. " +
      "Please wait a few minutes and try again."
    );
  }

  switch (code) {
    case "auth/operation-not-allowed":
      return (
        "Phone sign-in is not enabled for this app. Contact support if this keeps happening."
      );
    case "auth/invalid-phone-number":
      return "That phone number isn't valid. Include your country code, e.g. +12025551234.";
    case "auth/too-many-requests":
      return "Too many attempts from this device. Please wait a few minutes and try again.";
    case "auth/invalid-verification-code":
      return "That code doesn't match. Check the 6 digits in your text message and try again.";
    case "auth/code-expired":
      return "This code has expired. Go back, request a new code, and enter it right away.";
    case "auth/captcha-check-failed":
      return "The security check failed. Refresh the page and try sending the code again.";
    case "auth/missing-verification-code":
      return "Enter the 6-digit code from your text message.";
    case "auth/invalid-verification-id":
      return "Your verification session expired. Go back and request a new code.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support for help.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      if (message.includes("Verification session expired")) {
        return message;
      }
      return message.replace(/^Firebase:\s*/i, "").replace(/\s*\(auth\/[^)]+\)\.?\s*$/, ".");
  }
}
