import { NextResponse } from "next/server";

import { verifyS3Access } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";

/** Whether property photo uploads are available and credentials resolve. */
export async function GET(request: Request) {
  const limit = rateLimit(`upload-status:${getRequestIp(request)}`, 30, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { enabled: false, reason: "Too many checks. Please wait." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!isS3Configured()) {
    return NextResponse.json({
      enabled: false,
      reason: "Set S3_BUCKET_NAME in .env (and AWS_REGION).",
    });
  }

  const check = await verifyS3Access();
  if (!check.ok) {
    return NextResponse.json({
      enabled: false,
      reason: check.message,
    });
  }

  // Only expose whether uploads work — not how credentials are sourced.
  return NextResponse.json({ enabled: true });
}
