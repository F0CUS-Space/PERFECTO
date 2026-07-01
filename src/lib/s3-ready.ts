import { env } from "@/env";

import { hasExplicitAwsCredentials } from "@/lib/s3";

/**
 * True when S3 uploads can be attempted.
 * Bucket name is required. Keys are optional on EC2 (IAM instance role).
 */
export function isS3Configured(): boolean {
  if (!env.S3_BUCKET_NAME?.trim()) return false;
  if (hasExplicitAwsCredentials()) return true;
  // Production on EC2/ECS uses the instance/task IAM role when keys are omitted.
  return env.NODE_ENV === "production";
}
