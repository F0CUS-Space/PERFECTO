/**
 * Next.js server startup hook. Runs once when the server boots (not at build
 * time), which is the right place to enforce runtime configuration invariants.
 */
export async function register() {
  // Only run on the Node.js server runtime (skip Edge and any build-time passes).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertPaymentsConfiguredForProduction } = await import("@/lib/startup-checks");
  assertPaymentsConfiguredForProduction();
}
