import { NextResponse } from "next/server";

import { MAX_PHOTO_BYTES } from "@/config/booking";
import { optimizeServiceImage } from "@/lib/optimize-image";
import { getViewUrl, putObject } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { UploadValidationError, assertAllowedImageUpload } from "@/lib/upload-validation";
import { requireAdmin } from "@/server/rbac";

/** Admin gallery image upload. */
export async function POST(request: Request) {
  const limit = await rateLimit(`upload-gallery:${getRequestIp(request)}`, 40, 10 * 60 * 1000);
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

    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Each image must be under 5 MB." }, { status: 400 });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    assertAllowedImageUpload(raw, file.type, file.name);

    const optimized = await optimizeServiceImage(raw);
    // Flat key: gallery/{uuid}.webp — older nested keys (gallery/{uuid}/gallery.webp) still resolve via DB.
    const key = `gallery/${crypto.randomUUID()}.${optimized.extension}`;

    await putObject(key, optimized.buffer, optimized.contentType);
    const viewUrl = await getViewUrl(key, 3600);

    return NextResponse.json({ key, viewUrl });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[uploads/gallery]", error);
    return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
  }
}
