import "server-only";

import sharp from "sharp";

/** Max edge for catalog/hero service images (cards + detail). */
const SERVICE_IMAGE_MAX_EDGE = 1600;
const SERVICE_IMAGE_QUALITY = 78;

/**
 * Resize + WebP-encode for service catalog images.
 * Keeps upload payloads small when Next image optimization is disabled.
 */
export async function optimizeServiceImage(input: Buffer): Promise<{
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
}> {
  const buffer = await sharp(input)
    .rotate()
    .resize({
      width: SERVICE_IMAGE_MAX_EDGE,
      height: SERVICE_IMAGE_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: SERVICE_IMAGE_QUALITY })
    .toBuffer();

  return { buffer, contentType: "image/webp", extension: "webp" };
}
