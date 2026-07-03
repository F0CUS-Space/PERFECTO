import "server-only";

import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";
import { getViewUrl } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3-ready";

export interface GalleryItemRow {
  id: string;
  type: "CARD" | "BEFORE_AFTER";
  title: string;
  category: string;
  imageUrl: string | null;
  beforeUrl: string | null;
  afterUrl: string | null;
  sortOrder: number;
}

async function resolveImageUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http") || value.startsWith("/")) return value;
  if (isS3Configured()) {
    try {
      return await getViewUrl(value, 86400);
    } catch {
      return null;
    }
  }
  return null;
}

export async function getActiveGalleryItems(): Promise<GalleryItemRow[]> {
  if (!isDatabaseConfigured()) return [];

  const items = await prisma.galleryItem.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  return Promise.all(
    items.map(async (item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      category: item.category,
      imageUrl: await resolveImageUrl(item.imageUrl),
      beforeUrl: await resolveImageUrl(item.beforeUrl),
      afterUrl: await resolveImageUrl(item.afterUrl),
      sortOrder: item.sortOrder,
    })),
  );
}

export async function getAdminGalleryItems() {
  if (!isDatabaseConfigured()) return [];
  return prisma.galleryItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
}
