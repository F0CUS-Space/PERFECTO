import "server-only";

import type { Service } from "@prisma/client";

import { defaultServiceDetail, serviceDetails } from "@/content/services-detail";
import { getViewUrl } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";

export interface ServicePageContent {
  longDescription: string;
  includes: string[];
  idealFor: string[];
  pricingNote: string;
  accent: string;
}

const DEFAULT_PRICING_NOTE =
  "Your final price depends on your space and selected add-ons. Use our instant quote calculator to see an estimate in seconds — no surprises.";

/** Marketing detail for a service page — DB fields with static fallback. */
export function getServicePageContent(service: Service): ServicePageContent {
  const staticDetail = serviceDetails[service.slug] ?? defaultServiceDetail;

  return {
    longDescription: service.longDescription?.trim() || staticDetail.longDescription,
    includes: service.includes.length > 0 ? service.includes : staticDetail.includes,
    idealFor: service.idealFor.length > 0 ? service.idealFor : staticDetail.idealFor,
    pricingNote: service.pricingNote?.trim() || DEFAULT_PRICING_NOTE,
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
