import { NextResponse } from "next/server";

import { isS3Configured } from "@/lib/s3-ready";

/** Whether property photo uploads are available (S3 env vars set). */
export async function GET() {
  return NextResponse.json({ enabled: isS3Configured() });
}
