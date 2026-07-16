import { NextResponse } from "next/server";

import { MAX_PHOTO_BYTES } from "@/config/booking";
import { formatS3Error, getViewUrl, putObject } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/server/auth";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/**
 * Server-side photo upload — avoids S3 CORS configuration in the browser.
 * Accepts multipart/form-data with a single "file" field.
 */
export async function POST(request: Request) {
  const limit = rateLimit(`upload-booking-photo:${getRequestIp(request)}`, 20, 10 * 60 * 1000);
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

  const userLimit = rateLimit(`upload-booking-photo-user:${user.id}`, 30, 10 * 60 * 1000);
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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Each photo must be under 5 MB." }, { status: 400 });
    }

    const safeName = sanitizeFilename(file.name || "photo.jpg");
    const key = `bookings/staging/${user.id}/${crypto.randomUUID()}/${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await putObject(key, buffer, file.type);
    const viewUrl = await getViewUrl(key, 3600);

    return NextResponse.json({ key, viewUrl });
  } catch (error) {
    console.error("[uploads/booking-photo]", error);
    return NextResponse.json(
      { error: `Unable to upload photo. ${formatS3Error(error)}` },
      { status: 500 },
    );
  }
}
