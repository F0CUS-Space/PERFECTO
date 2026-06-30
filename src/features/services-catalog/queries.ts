import "server-only";

import { prisma } from "@/lib/prisma";

/** All active services, ordered for display. */
export async function getActiveServices() {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** A single active service by slug (for individual service pages). */
export async function getServiceBySlug(slug: string) {
  return prisma.service.findFirst({
    where: { slug, isActive: true },
  });
}

/** Slugs for static generation of service pages. */
export async function getServiceSlugs() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return services.map((s) => s.slug);
}

/** Active add-ons (used by the quote calculator + service detail pages). */
export async function getActiveAddOns() {
  return prisma.addOn.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}
