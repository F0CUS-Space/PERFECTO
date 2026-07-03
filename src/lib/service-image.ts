import { defaultServiceDetail, serviceDetails } from "@/content/services-detail";

/** Marketing/catalog image for a service slug (sync fallback — prefer resolveServiceImageUrl). */
export function getServiceImage(slug: string, imageUrl?: string | null): string {
  if (imageUrl?.trim()) {
    const value = imageUrl.trim();
    if (value.startsWith("http") || value.startsWith("/")) return value;
  }
  return serviceDetails[slug]?.image ?? defaultServiceDetail.image;
}
