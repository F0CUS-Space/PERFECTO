import { NextResponse } from "next/server";

import { getViewUrl, putObject } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import {
  UploadValidationError,
  assertPdfUpload,
} from "@/lib/upload-validation";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** Public resume upload for job applications (PDF only). */
export async function POST(request: Request) {
  // Public, unauthenticated S3 write — throttle per IP to limit abuse/cost.
  const limit = await rateLimit(`resume-upload:${getRequestIp(request)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "Resume uploads are not configured." },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_RESUME_BYTES) {
      return NextResponse.json({ error: "Resume must be under 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    assertPdfUpload(buffer, file.type, file.name);

    // Flat key — older nested applications/{uuid}/{name}.pdf still resolve via DB.
    const key = `applications/${crypto.randomUUID()}.pdf`;

    await putObject(key, buffer, "application/pdf");
    const viewUrl = await getViewUrl(key, 3600);

    return NextResponse.json({ key, viewUrl });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[uploads/resume]", error);
    return NextResponse.json({ error: "Unable to upload resume." }, { status: 500 });
  }
}
