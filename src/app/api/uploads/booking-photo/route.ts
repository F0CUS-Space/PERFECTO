import { NextResponse } from "next/server";

import { MAX_PHOTO_BYTES } from "@/config/booking";
import { optimizeServiceImage } from "@/lib/optimize-image";
import { getViewUrl, putObject } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { UploadValidationError, assertAllowedImageUpload } from "@/lib/upload-validation";
import { getCurrentUser } from "@/server/auth";

/**
 * Server-side photo upload — avoids S3 CORS configuration in the browser.
 * Accepts multipart/form-data with a single "file" field.
 */
export async function POST(request: Request) {
  const limit = await rateLimit(`upload-booking-photo:${getRequestIp(request)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload photos." }, { status: 401 });
  }

  const userLimit = await rateLimit(`upload-booking-photo-user:${user.id}`, 30, 10 * 60 * 1000);
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: "Too many uploads for this account. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSeconds) } },
    );
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "Photo uploads are not configured on the server." },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Each photo must be under 5 MB." }, { status: 400 });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    assertAllowedImageUpload(raw, file.type, file.name);

    const optimized = await optimizeServiceImage(raw);
    // Flat under user staging prefix (ownership check uses bookings/staging/{userId}/).
    const key = `bookings/staging/${user.id}/${crypto.randomUUID()}.${optimized.extension}`;

    await putObject(key, optimized.buffer, optimized.contentType);
    const viewUrl = await getViewUrl(key, 3600);

    return NextResponse.json({ key, viewUrl });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[uploads/booking-photo]", error);
    return NextResponse.json({ error: "Unable to upload photo." }, { status: 500 });
  }
}
