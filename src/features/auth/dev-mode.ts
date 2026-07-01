import "server-only";

export function isServerAuthDevMode(): boolean {
  return (
    process.env.AUTH_DEV_MODE === "true" ||
    process.env.NEXT_PUBLIC_AUTH_DEV_MODE === "true"
  );
}
