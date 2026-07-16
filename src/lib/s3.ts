import "server-only";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env, requireEnv } from "@/env";
import { logOutboundS3 } from "@/lib/outbound-log";

let s3Client: S3Client | undefined;

/** True when non-empty access key pair is in environment (not EC2 instance role). */
export function hasExplicitAwsCredentials(): boolean {
  const id = env.AWS_ACCESS_KEY_ID?.trim();
  const secret = env.AWS_SECRET_ACCESS_KEY?.trim();
  return Boolean(id && secret);
}

function getClient(): S3Client {
  if (!s3Client) {
    const config: ConstructorParameters<typeof S3Client>[0] = {
      region: env.AWS_REGION,
    };

    if (hasExplicitAwsCredentials()) {
      config.credentials = {
        accessKeyId: env.AWS_ACCESS_KEY_ID!.trim(),
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!.trim(),
      };
    } else {
      // EC2 instance role / ECS task role — do NOT pass empty env keys (breaks this chain).
      config.credentials = defaultProvider();
    }

    s3Client = new S3Client(config);
  }
  return s3Client;
}

function bucketName() {
  return requireEnv("S3_BUCKET_NAME").trim();
}

/** Quick check that credentials + bucket access work (for /api/uploads/status). */
export async function verifyS3Access(): Promise<
  { ok: true; credentialSource: "env" | "iam-role" | "other" } | { ok: false; message: string }
> {
  const started = Date.now();
  try {
    let credentialSource: "env" | "iam-role" | "other" = "other";
    if (hasExplicitAwsCredentials()) {
      credentialSource = "env";
    } else {
      const creds = await defaultProvider()();
      credentialSource = creds.accessKeyId?.startsWith("ASIA") ? "iam-role" : "other";
    }

    await getClient().send(new HeadBucketCommand({ Bucket: bucketName() }));
    logOutboundS3({ op: "head-bucket", durationMs: Date.now() - started, ok: true });
    return { ok: true, credentialSource };
  } catch (error) {
    const message = error instanceof Error ? error.message : "S3 access check failed";
    logOutboundS3({
      op: "head-bucket",
      durationMs: Date.now() - started,
      ok: false,
      error: message,
    });
    if (/Could not load credentials|CredentialsProviderError|EC2 Metadata/i.test(message)) {
      return {
        ok: false,
        message:
          `${message} — Docker on EC2 cannot reach the instance IAM role unless ` +
          "EC2 metadata hop limit is 2 (see README). Or add AWS_ACCESS_KEY_ID/SECRET to .env.",
      };
    }
    return { ok: false, message };
  }
}

/** Returns a short-lived presigned URL the browser can PUT a file to directly. */
export async function getUploadUrl(key: string, contentType: string, expiresIn = 300) {
  const bucket = bucketName();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn });
  const viewUrl = await getViewUrl(key, 3600);
  return { uploadUrl, viewUrl, key };
}

/** Upload bytes from the server (avoids browser CORS against S3). */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const started = Date.now();
  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    logOutboundS3({
      op: "put",
      key,
      bytes: body.byteLength,
      durationMs: Date.now() - started,
      ok: true,
    });
  } catch (error) {
    logOutboundS3({
      op: "put",
      key,
      bytes: body.byteLength,
      durationMs: Date.now() - started,
      ok: false,
      error: error instanceof Error ? error.message : "put failed",
    });
    throw error;
  }
}

/** Presigned GET for private bucket thumbnails and admin reads. */
export async function getViewUrl(key: string, expiresIn = 3600): Promise<string> {
  const started = Date.now();
  try {
    const command = new GetObjectCommand({ Bucket: bucketName(), Key: key });
    const url = await getSignedUrl(getClient(), command, { expiresIn });
    logOutboundS3({ op: "get-presign", key, durationMs: Date.now() - started, ok: true });
    return url;
  } catch (error) {
    logOutboundS3({
      op: "get-presign",
      key,
      durationMs: Date.now() - started,
      ok: false,
      error: error instanceof Error ? error.message : "presign failed",
    });
    throw error;
  }
}

export async function deleteObject(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}

/** User-facing hint from AWS SDK errors. */
export function formatS3Error(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown S3 error.";
  const name = error.name;
  const msg = error.message;

  if (/Could not load credentials|CredentialsProviderError|EC2 Metadata/i.test(msg)) {
    return (
      "Could not load AWS credentials inside Docker. On EC2 with an IAM instance role, set " +
      "metadata hop limit to 2 (AWS console → Instance → Actions → Modify instance metadata options), " +
      "then restart the app container. Or add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to .env " +
      "(remove blank lines — empty values block the instance role)."
    );
  }
  if (name === "AccessDenied" || /Access Denied/i.test(msg)) {
    return `Access denied — IAM role needs s3:PutObject and s3:GetObject on arn:aws:s3:::${env.S3_BUCKET_NAME ?? "your-bucket"}/bookings/*`;
  }
  if (name === "PermanentRedirect" || /PermanentRedirect/i.test(msg)) {
    return `Wrong AWS_REGION for this bucket. Set AWS_REGION in .env to match the bucket region.`;
  }
  if (name === "NoSuchBucket") {
    return `Bucket "${env.S3_BUCKET_NAME}" not found — check S3_BUCKET_NAME in .env.`;
  }
  return `${name}: ${msg}`;
}
