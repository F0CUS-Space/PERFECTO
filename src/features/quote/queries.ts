import "server-only";

import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";
import { CacheKeys, CacheTtl, cacheRemember } from "@/lib/cache";

export interface QuoteCatalogAddOn {
  id: string;
  name: string;
  price: number;
}

export interface QuoteCatalogService {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  isPopular: boolean;
  addOns: QuoteCatalogAddOn[];
}

/** Services with eligible add-ons for the quote calculator. */
export async function getQuoteCatalog(): Promise<QuoteCatalogService[]> {
  if (!isDatabaseConfigured()) return [];
  return cacheRemember(CacheKeys.quoteCatalog, CacheTtl.catalog, async () => {
    try {
      const services = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          addOns: {
            where: { addOn: { isActive: true } },
            include: { addOn: true },
            orderBy: { addOn: { name: "asc" } },
          },
        },
      });

      return services.map((service) => ({
        id: service.id,
        slug: service.slug,
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        isPopular: service.isPopular,
        addOns: service.addOns.map(({ addOn }) => ({
          id: addOn.id,
          name: addOn.name,
          price: addOn.price,
        })),
      }));
    } catch {
      return [];
    }
  });
}
