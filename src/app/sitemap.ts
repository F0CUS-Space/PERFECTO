import type { MetadataRoute } from "next";

import { env } from "@/env";
import { getServiceSlugs } from "@/features/services-catalog/queries";
import { legalSlugs } from "@/content/legal";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL;

  const staticPaths = [
    "",
    "/services",
    "/quote",
    "/about",
    "/gallery",
    "/testimonials",
    "/faq",
    "/promotions",
    "/contact",
    "/careers",
  ];

  let serviceSlugs: string[] = [];
  try {
    serviceSlugs = await getServiceSlugs();
  } catch {
    // Database may be unavailable at build time; ship the static routes regardless.
    serviceSlugs = [];
  }

  const now = new Date();

  return [
    ...staticPaths.map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
    })),
    ...serviceSlugs.map((slug) => ({
      url: `${base}/services/${slug}`,
      lastModified: now,
    })),
    ...legalSlugs.map((slug) => ({
      url: `${base}/legal/${slug}`,
      lastModified: now,
    })),
  ];
}
