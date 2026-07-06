import "server-only";

export function isServerAuthDevMode(): boolean {
  // Hard stop: the phone-auth bypass (custom tokens, no SMS/OTP verification) must
  // never be reachable in a production build, even if an env flag is left enabled.
  if (process.env.NODE_ENV === "production") return false;

  return (
    process.env.AUTH_DEV_MODE === "true" ||
    process.env.NEXT_PUBLIC_AUTH_DEV_MODE === "true"
  );
}
