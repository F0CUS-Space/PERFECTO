/** App-owned object key prefixes stored in CMS fields (not local `/…` paths or absolute URLs). */
const APP_OWNED_S3_PREFIXES = ["services/", "gallery/", "bookings/"] as const;

/**
 * True when `value` is an S3 object key we manage (e.g. `services/…`, `gallery/…`).
 * Local public paths and http(s) URLs are never deleted via this check.
 */
export function isAppOwnedS3Key(value: string | null | undefined): boolean {
  const val = value?.trim();
  if (!val) return false;
  if (val.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(val)) return false;
  return APP_OWNED_S3_PREFIXES.some((prefix) => val.startsWith(prefix));
}
