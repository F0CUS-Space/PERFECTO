import "server-only";

import { env } from "@/env";
import { isAppOwnedS3Key } from "@/lib/app-owned-s3-key";

export { isAppOwnedS3Key };

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
