import { NextResponse } from "next/server";
import { z } from "zod";

import { getUploadUrl } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { isAllowedImageContentType, sanitizeUploadFilename } from "@/lib/upload-validation";
import { getCurrentUser } from "@/server/auth";

const presignSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(200)
    .refine((name) => !name.toLowerCase().endsWith(".svg"), "SVG images are not allowed."),
  contentType: z
    .string()
    .refine(isAllowedImageContentType, "Only JPEG, PNG, or WebP images are allowed."),
});

/** Returns a presigned PUT URL for staging booking property photos. */
export async function POST(request: Request) {
  const limit = await rateLimit(`upload-presign:${getRequestIp(request)}`, 30, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many upload requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

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
    const safeName = sanitizeUploadFilename(body.filename);
    const ext = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".") + 1) : "bin";
    const key = `bookings/staging/${user.id}/${crypto.randomUUID()}.${ext}`;
    const { uploadUrl, viewUrl } = await getUploadUrl(key, body.contentType);

    return NextResponse.json({ uploadUrl, key, viewUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    console.error("[uploads/presign]", error);
    return NextResponse.json({ error: "Unable to prepare upload" }, { status: 500 });
  }
}
