import { defaultServiceDetail, serviceDetails } from "@/content/services-detail";

/** Marketing/catalog image for a service slug (falls back to default). */
export function getServiceImage(slug: string, imageUrl?: string | null): string {
  if (imageUrl?.trim()) return imageUrl;
  return serviceDetails[slug]?.image ?? defaultServiceDetail.image;
}
