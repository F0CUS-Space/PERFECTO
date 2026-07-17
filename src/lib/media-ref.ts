import "server-only";

import { env } from "@/env";

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

/**
 * CMS media refs must be local paths, our S3 object keys, or HTTPS URLs to our bucket only.
 * Arbitrary third-party URLs were rejected after an AWS outbound DoS alert — they could be
 * fed into Next `/_next/image` (when enabled) and amplify egress.
 */
export function isAllowedMediaRef(value: string): boolean {
  const val = value.trim();
  if (!val) return true;

  if (val.startsWith("/") || isAppOwnedS3Key(val)) {
    return true;
  }

  try {
    const url = new URL(val);
    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    const bucket = env.S3_BUCKET_NAME?.trim().toLowerCase();
    if (!bucket) {
      // Without a configured bucket, only reject obvious non-S3 hosts later via key-only uploads.
      return host.endsWith(".amazonaws.com");
    }

    return (
      host === `${bucket}.s3.amazonaws.com` ||
      (host.startsWith(`${bucket}.s3.`) && host.endsWith(".amazonaws.com")) ||
      (host.startsWith("s3.") &&
        host.endsWith(".amazonaws.com") &&
        url.pathname.startsWith(`/${bucket}/`))
    );
  } catch {
    return false;
  }
}
