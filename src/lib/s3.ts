import "server-only";

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env, requireEnv } from "@/env";

let s3Client: S3Client | undefined;

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
      },
    });
  }
  return s3Client;
}

/** Returns a short-lived presigned URL the browser can PUT a file to directly. */
export async function getUploadUrl(key: string, contentType: string, expiresIn = 300) {
  const bucket = requireEnv("S3_BUCKET_NAME");
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn });
  const publicUrl = `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  return { uploadUrl, publicUrl, key };
}

export async function deleteObject(key: string) {
  const bucket = requireEnv("S3_BUCKET_NAME");
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
