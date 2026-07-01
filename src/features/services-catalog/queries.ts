import "server-only";

import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";

/** All active services, ordered for display. */
export async function getActiveServices() {
  if (!isDatabaseConfigured()) return [];
  try {
    return await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return [];
  }
}

/** A single active service by slug (for individual service pages). */
export async function getServiceBySlug(slug: string) {
  if (!isDatabaseConfigured()) return null;
  try {
    return await prisma.service.findFirst({
      where: { slug, isActive: true },
    });
  } catch {
    return null;
  }
}

/** Slugs for static generation of service pages. */
export async function getServiceSlugs() {
  if (!isDatabaseConfigured()) return [];
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    return services.map((s) => s.slug);
  } catch {
    return [];
  }
}

/** Active add-ons (used by the quote calculator + service detail pages). */
export async function getActiveAddOns() {
  if (!isDatabaseConfigured()) return [];
  try {
    return await prisma.addOn.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}
