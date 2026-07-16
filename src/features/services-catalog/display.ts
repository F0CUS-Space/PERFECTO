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

  const includes = Array.isArray(service.includes) ? service.includes : [];
  const idealFor = Array.isArray(service.idealFor) ? service.idealFor : [];

  return {
    longDescription: service.longDescription?.trim() || service.description,
    includes: includes.length > 0 ? includes : staticDetail.includes,
    idealFor: idealFor.length > 0 ? idealFor : staticDetail.idealFor,
    accent: staticDetail.accent,
  };
}

/** Resolve hero/card image — S3 key, local path, or static fallback by slug. */
export async function resolveServiceImageUrl(
  imageUrl: string | null | undefined,
  slug: string,
): Promise<string> {
  // Prefer brand asset that ships in the Docker image; seeded /images/* paths are often missing.
  const staticFallback =
    serviceDetails[slug]?.image && !serviceDetails[slug]!.image.startsWith("/images/")
      ? serviceDetails[slug]!.image
      : "/brand/perfecto-icon.png";
  const value = imageUrl?.trim();
  if (!value) return staticFallback;
  // Seeded marketing paths under /images/ were never added to /public — avoid broken next/image.
  if (value.startsWith("/images/")) return staticFallback;
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
