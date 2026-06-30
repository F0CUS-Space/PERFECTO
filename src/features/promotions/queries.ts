import "server-only";

import { prisma } from "@/lib/prisma";

/** Active promotions for the public promotions page (display only in V1.0). */
export async function getActivePromotions() {
  return prisma.promotion.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}
