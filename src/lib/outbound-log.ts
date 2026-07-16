import "server-only";

/** Structured log for AWS/S3 egress so CloudWatch can spot upload floods. */
export function logOutboundS3(event: {
  op: "put" | "get-presign" | "head-bucket" | "delete";
  key?: string;
  bytes?: number;
  durationMs: number;
  ok: boolean;
  error?: string;
}): void {
  console.info(
    JSON.stringify({
      type: "outbound_s3",
      ...event,
      key: event.key ? event.key.replace(/\/[^/]+$/, "/*") : undefined,
      at: new Date().toISOString(),
    }),
  );
}
