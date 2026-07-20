import "server-only";

/** Allowed raster image MIME types (SVG intentionally excluded). */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const IMAGE_MIME_ALIASES: Record<string, AllowedImageMime> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

/** Safe validation failure for API/client responses (no infra details). */
export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export function sanitizeUploadFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function normalizeMime(contentType: string): string {
  return contentType.toLowerCase().split(";")[0]?.trim() ?? "";
}

function hasJpegMagic(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function hasPngMagic(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

function hasWebpMagic(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  );
}

/** PDF magic after optional leading whitespace (per PDF spec). */
function hasPdfMagic(buf: Buffer): boolean {
  let i = 0;
  const max = Math.min(buf.length, 1024);
  while (i < max && (buf[i] === 0x20 || buf[i] === 0x09 || buf[i] === 0x0d || buf[i] === 0x0a)) {
    i += 1;
  }
  return i + 5 <= buf.length && buf.subarray(i, i + 5).toString("ascii") === "%PDF-";
}

function looksLikeSvg(buffer: Buffer, declaredType: string, filename: string): boolean {
  if (declaredType === "image/svg+xml" || filename.toLowerCase().endsWith(".svg")) {
    return true;
  }
  const head = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8").trimStart();
  if (/^<\?xml/i.test(head) && /<svg[\s>]/i.test(head)) return true;
  if (/^<svg[\s>]/i.test(head)) return true;
  return false;
}

export function detectImageMimeFromMagic(buffer: Buffer): AllowedImageMime | null {
  if (hasJpegMagic(buffer)) return "image/jpeg";
  if (hasPngMagic(buffer)) return "image/png";
  if (hasWebpMagic(buffer)) return "image/webp";
  return null;
}

/** Resolve allowlisted image MIME (supports image/jpg → image/jpeg). */
export function resolveAllowedImageMime(contentType: string): AllowedImageMime | null {
  return IMAGE_MIME_ALIASES[normalizeMime(contentType)] ?? null;
}

export function isAllowedImageContentType(contentType: string): boolean {
  return resolveAllowedImageMime(contentType) !== null;
}

/**
 * Validates declared type + magic bytes for an image upload.
 * Rejects SVG and non-allowlisted types. Returns the detected MIME.
 */
export function assertAllowedImageUpload(
  buffer: Buffer,
  declaredType: string,
  filename: string,
): AllowedImageMime {
  const normalized = normalizeMime(declaredType);
  const name = filename || "upload";

  if (looksLikeSvg(buffer, normalized, name)) {
    throw new UploadValidationError("SVG images are not allowed.");
  }

  const declared = resolveAllowedImageMime(normalized);
  if (!declared) {
    throw new UploadValidationError("Only JPEG, PNG, or WebP images are allowed.");
  }

  const detected = detectImageMimeFromMagic(buffer);
  if (!detected) {
    throw new UploadValidationError("File content does not match an allowed image type.");
  }

  if (detected !== declared) {
    throw new UploadValidationError("File content does not match the declared image type.");
  }

  return detected;
}

/** Validates PDF resumes: declared type/extension + `%PDF-` magic bytes. */
export function assertPdfUpload(buffer: Buffer, declaredType: string, filename: string): void {
  const normalized = normalizeMime(declaredType);
  const name = (filename || "").toLowerCase();
  const looksPdf = normalized === "application/pdf" || name.endsWith(".pdf");
  if (!looksPdf) {
    throw new UploadValidationError("Only PDF resumes are allowed.");
  }
  if (!hasPdfMagic(buffer)) {
    throw new UploadValidationError("Only valid PDF files are allowed.");
  }
}
