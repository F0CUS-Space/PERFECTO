import { NextResponse } from "next/server";

import { MAX_PHOTO_BYTES } from "@/config/booking";
import { optimizeServiceImage } from "@/lib/optimize-image";
import { formatS3Error, getViewUrl, putObject } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/server/rbac";

/** Admin service hero image upload. */
export async function POST(request: Request) {
  const limit = rateLimit(`upload-service:${getRequestIp(request)}`, 40, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json({ error: "Image uploads are not configured." }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Each image must be under 5 MB." }, { status: 400 });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeServiceImage(raw);
    const key = `services/${crypto.randomUUID()}/service.${optimized.extension}`;

    await putObject(key, optimized.buffer, optimized.contentType);
    const viewUrl = await getViewUrl(key, 3600);

    return NextResponse.json({ key, viewUrl });
  } catch (error) {
    console.error("[uploads/service]", error);
    return NextResponse.json(
      { error: `Unable to upload image. ${formatS3Error(error)}` },
      { status: 500 },
    );
  }
}
