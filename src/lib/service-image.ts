import { defaultServiceDetail, serviceDetails } from "@/content/services-detail";

/** Marketing/catalog image for a service slug (sync fallback — prefer resolveServiceImageUrl). */
export function getServiceImage(slug: string, imageUrl?: string | null): string {
  if (imageUrl?.trim()) {
    const value = imageUrl.trim();
    if (value.startsWith("http")) return value;
    if (value.startsWith("/")) {
      if (value.startsWith("/images/services/") && value.endsWith(".png")) {
        return value.replace(/\.png$/i, ".webp");
      }
      return value;
    }
  }
  return serviceDetails[slug]?.image ?? defaultServiceDetail.image;
}
