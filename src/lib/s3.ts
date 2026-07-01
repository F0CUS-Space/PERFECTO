import "server-only";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env, requireEnv } from "@/env";

let s3Client: S3Client | undefined;

function getClient(): S3Client {
  if (!s3Client) {
    const config: ConstructorParameters<typeof S3Client>[0] = {
      region: env.AWS_REGION,
    };

    // On EC2 with an IAM instance role, omit explicit keys — SDK uses the role automatically.
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      };
    }

    s3Client = new S3Client(config);
  }
  return s3Client;
}

function bucketName() {
  return requireEnv("S3_BUCKET_NAME");
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
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** Presigned GET for private bucket thumbnails and admin reads. */
export async function getViewUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucketName(), Key: key });
  return getSignedUrl(getClient(), command, { expiresIn });
}

export async function deleteObject(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}
