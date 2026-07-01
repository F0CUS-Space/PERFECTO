import { NextResponse } from "next/server";
import { z } from "zod";

import { getUploadUrl } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getCurrentUser } from "@/server/auth";

const presignSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().regex(/^image\//, "Only image uploads are allowed"),
});

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/** Returns a presigned PUT URL for staging booking property photos. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "File uploads are not configured. Contact support or try again later." },
      { status: 503 },
    );
  }

  try {
    const body = presignSchema.parse(await request.json());
    const safeName = sanitizeFilename(body.filename);
    const key = `bookings/staging/${user.id}/${crypto.randomUUID()}/${safeName}`;
    const { uploadUrl, viewUrl } = await getUploadUrl(key, body.contentType);

    return NextResponse.json({ uploadUrl, key, viewUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    console.error("[uploads/presign]", error);
    return NextResponse.json({ error: "Unable to prepare upload" }, { status: 500 });
  }
}
