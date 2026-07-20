import "server-only";

import sharp from "sharp";

export type OptimizedImage = {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
};

type OptimizePreset = "marketing" | "booking";

/**
 * Marketing covers (service hero + gallery): sharper on large cards/detail.
 * Booking property photos: smaller edge — admin review, not hero display.
 *
 * Sharp re-encode strips EXIF/GPS (no withMetadata). `.rotate()` applies
 * orientation first so phones don't land sideways.
 */
const PRESETS: Record<
  OptimizePreset,
  { maxEdge: number; quality: number; effort: number }
> = {
  marketing: { maxEdge: 1600, quality: 78, effort: 4 },
  booking: { maxEdge: 1280, quality: 75, effort: 4 },
};

async function optimizeToWebp(
  input: Buffer,
  preset: OptimizePreset,
): Promise<OptimizedImage> {
  const { maxEdge, quality, effort } = PRESETS[preset];

  const buffer = await sharp(input)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort })
    .toBuffer();

  return { buffer, contentType: "image/webp", extension: "webp" };
}

/** Resize + WebP-encode for service / gallery catalog images. */
export async function optimizeServiceImage(input: Buffer): Promise<OptimizedImage> {
  return optimizeToWebp(input, "marketing");
}

/** Resize + WebP-encode for booking property photos (staging → booking). */
export async function optimizeBookingPhoto(input: Buffer): Promise<OptimizedImage> {
  return optimizeToWebp(input, "booking");
}
