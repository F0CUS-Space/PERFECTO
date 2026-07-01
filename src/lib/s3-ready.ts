import { env } from "@/env";

/**
 * True when S3 uploads can be attempted.
 * Bucket name is required. Keys are optional on EC2 (IAM instance role).
 */
export function isS3Configured(): boolean {
  if (!env.S3_BUCKET_NAME) return false;
  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) return true;
  // Production on EC2/ECS uses the instance/task IAM role when keys are omitted.
  return env.NODE_ENV === "production";
}
