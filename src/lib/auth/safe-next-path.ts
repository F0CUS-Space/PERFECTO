/**
 * Returns a same-origin relative path suitable for post-login redirects.
 * Rejects protocol-relative (`//evil.com`) and absolute URLs.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  // Block backslash tricks that some browsers treat as scheme-relative.
  if (trimmed.includes("\\")) {
    return fallback;
  }
  return trimmed;
}
