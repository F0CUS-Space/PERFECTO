import { NextResponse } from "next/server";

import { formatS3Error, getViewUrl, putObject } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/** Public resume upload for job applications (PDF only). */
export async function POST(request: Request) {
  // Public, unauthenticated S3 write — throttle per IP to limit abuse/cost.
  const limit = rateLimit(`resume-upload:${getRequestIp(request)}`, 5, 10 * 60 * 1000);
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

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF resumes are allowed." }, { status: 400 });
    }

    if (file.size > MAX_RESUME_BYTES) {
      return NextResponse.json({ error: "Resume must be under 5 MB." }, { status: 400 });
    }

    const safeName = sanitizeFilename(file.name || "resume.pdf");
    const key = `applications/${crypto.randomUUID()}/${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await putObject(key, buffer, "application/pdf");
    const viewUrl = await getViewUrl(key, 3600);

    return NextResponse.json({ key, viewUrl });
  } catch (error) {
    console.error("[uploads/resume]", error);
    return NextResponse.json(
      { error: `Unable to upload resume. ${formatS3Error(error)}` },
      { status: 500 },
    );
  }
}
