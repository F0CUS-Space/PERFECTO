import { NextResponse } from "next/server";

import { MAX_PHOTO_BYTES } from "@/config/booking";
import { formatS3Error, putObject } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { requireAdmin } from "@/server/rbac";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/** Admin gallery image upload. */
export async function POST(request: Request) {
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

    const safeName = sanitizeFilename(file.name || "gallery.jpg");
    const key = `gallery/${crypto.randomUUID()}/${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await putObject(key, buffer, file.type);

    return NextResponse.json({ key, url: `/api/uploads/gallery/${encodeURIComponent(key)}` });
  } catch (error) {
    console.error("[uploads/gallery]", error);
    return NextResponse.json(
      { error: `Unable to upload image. ${formatS3Error(error)}` },
      { status: 500 },
    );
  }
}
