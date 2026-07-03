import "server-only";

import type { Service } from "@prisma/client";

import { defaultServiceDetail, serviceDetails } from "@/content/services-detail";
import { getViewUrl } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";

export interface ServicePageContent {
  longDescription: string;
  includes: string[];
  idealFor: string[];
  accent: string;
}

/** Marketing detail for a service page — uses DB content; accent from static map only. */
export function getServicePageContent(service: Service): ServicePageContent {
  const staticDetail = serviceDetails[service.slug] ?? defaultServiceDetail;

  return {
    longDescription: service.longDescription?.trim() || service.description,
    includes: service.includes,
    idealFor: service.idealFor,
    accent: staticDetail.accent,
  };
}

/** Resolve hero/card image — S3 key, local path, or static fallback by slug. */
export async function resolveServiceImageUrl(
  imageUrl: string | null | undefined,
  slug: string,
): Promise<string> {
  const staticFallback = serviceDetails[slug]?.image ?? defaultServiceDetail.image;
  const value = imageUrl?.trim();
  if (!value) return staticFallback;
  if (value.startsWith("http") || value.startsWith("/")) return value;
  if (isS3Configured()) {
    try {
      return await getViewUrl(value, 86400);
    } catch {
      return staticFallback;
    }
  }
  return staticFallback;
}
